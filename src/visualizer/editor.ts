import { computed, reactive, watch, watchEffect } from 'vue';
import { useIdle } from '@vueuse/core';
import { AsyncLock } from '@/components/lock';
import { matchTextInput } from '@/constants';
import { BeepboxTile, GrassTile, GroupTile, ImageTile, TextTile, Tile, VisualizerTile } from './tiles';
import Modulation from './modulation';

/**
 * Layout history references tile data to avoid copying unnecessarily.
 * Tiles only are garbage collected after being evicted from history, so data is preserved.
 * Group tiles are copied to preserve their settings and emulate them not being part of the layout system.
 */
type LayoutHistoryEntry = Exclude<Tile, GroupTile> | {
    tile: GroupTile,
    children: LayoutHistoryEntry[]
}

/**
 * Tile editing system.
 */
export class TileEditor {
    private static readonly idleTracker = useIdle(5000);

    static readonly state: {
        dropdownOpen: boolean
        sidebarOpen: boolean
        sidebarTab: 'edit' | 'sources' | 'modulators' | 'export' | 'playlist'
        hideTabs: boolean
        idleHideTabs: boolean
        sidebarScreenWidth: number
        readonly minSidebarWidthPx: number
        readonly tileTypes: { [key: string]: { Tile: typeof Tile, visible: boolean } | undefined }
        identifyTilesSidebar: Set<Tile>
        identifyTilesLayout: Set<Tile>
    } = reactive({
        dropdownOpen: true,
        sidebarOpen: false,
        sidebarTab: 'edit',
        hideTabs: false,
        idleHideTabs: computed(() => this.idleTracker.idle.value && !this.state.dropdownOpen && !this.state.sidebarOpen) as any, // vue ref unwrapping conflicts with need to preserve private properties
        sidebarScreenWidth: Number(localStorage.getItem('sidebarScreenWidth') ?? 25),
        minSidebarWidthPx: 200,
        tileTypes: {},
        identifyTilesSidebar: new Set() as any, // wHY auToMATIc rEf unWRAPPING SUCKS I FUCKING HATE IT
        identifyTilesLayout: new Set() as any
    });
    static readonly drag: {
        current: Tile | null
        offset: { x: number, y: number }
        size: { w: number, h: number }
        drop: {
            tile: Tile | null
            insertBefore: boolean
            createGroup: boolean
            newGroupVertical: boolean
        }
        sidebarDrop: boolean
    } = reactive({
        current: null,
        offset: { x: 0, y: 0 },
        size: { w: 0, h: 0 },
        drop: {
            tile: null,
            insertBefore: false,
            createGroup: false,
            newGroupVertical: false
        },
        sidebarDrop: false
    });
    static readonly modulatorDrag: {
        source: Modulation.Source<any> | null
        sourceKey: string
        target: Modulation.Target<any> | null
        targetKey: string
    } = reactive({
        source: null,
        sourceKey: '',
        target: null,
        targetKey: ''
    });
    /**Locks changing of layouts and all actions */
    static readonly lock: AsyncLock = reactive(new AsyncLock()) as AsyncLock;

    static registerTile(t: typeof Tile, visible: boolean): void {
        this.state.tileTypes[t.id] = { Tile: t, visible: visible };
    }

    /**
     * Root node of current layout on screen, wrapped inside a `Reactive` object.
     * Because of this `reactive()` wrapper Vue's automatic ref unwrapping nukes your types and causes unimaginable
     * pain when refs are used in literally any code that gets referenced within a tile instance.
     */
    static readonly root: GroupTile = reactive(new GroupTile()) as GroupTile;
    // without the cast ref unwrapping is mostly solved but then everything must be public in every class
    // literally a tradeoff of shit code or crap code
    // also reactive proxies absolutely destroy things like sets and arrays

    /**
     * Replace the current layout with a new layout. Consumes the provided tree and returns the root of the new tree.
     * @param root Provided layout
     * @returns Reference to root of new tree
     */
    static attachRoot(root: GroupTile): GroupTile {
        this.endDrag();
        this.clearLayoutStack();
        this.root.copyProperties(root);
        this.root.label = root.label;
        for (const child of root.children) child.parent = this.root;
        this.root.children.length = 0;
        this.root.children.push(...root.children);
        root.children.length = 0;
        return this.root;
    }
    /**
     * Remove and return the current layout as a new tree. Deletes the current tree and returns the root of the new tree.
     * @returns Reference to root of new tree
     */
    static detachRoot(): GroupTile {
        this.endDrag();
        this.clearLayoutStack();
        const root = new GroupTile();
        root.copyProperties(this.root);
        root.label = this.root.label;
        for (const child of this.root.children) child.parent = root;
        root.children.length = 0;
        root.children.push(...this.root.children);
        this.root.children.length = 0;
        this.root.addChild(new Tile()); // blank tile to fill group tile
        this.root.label = 'Root Group Tile';
        return root;
    }

    private static readonly flattenedTiles: Set<Tile> = reactive(new Set()) as Set<Tile>;
    static readonly currentTiles = computed(() => new Set(this.flattenedTiles));

    /**Stores layout history separate from tile data - root of history can never be group tile */
    private static readonly undoHistory: Exclude<LayoutHistoryEntry, Tile>[] = [];
    private static readonly redoHistory: Exclude<LayoutHistoryEntry, Tile>[] = [];
    private static readonly maxLayoutHistory: 64;
    private static pushLayoutHistory(historyStack: Exclude<LayoutHistoryEntry, Tile>[], maxStackSize: number = Infinity): void {
        // root of history isn't root group tile, always starts as children of root
        const entry: Exclude<LayoutHistoryEntry, Tile> = {
            tile: new GroupTile(),
            children: []
        };
        const stack: [GroupTile, Exclude<LayoutHistoryEntry, Tile>][] = [[this.root, entry]];
        while (stack.length > 0) {
            const [tile, entry] = stack.pop()!;
            entry.tile.copyProperties(tile);
            entry.tile.size = tile.size;
            entry.tile.label = tile.label;
            for (const child of tile.children) {
                if (child instanceof GroupTile) {
                    const entry2 = {
                        tile: new GroupTile(),
                        children: []
                    };
                    entry.children.push(entry2);
                    stack.push([child, entry2]);
                } else {
                    entry.children.push(child);
                }
            }
        }
        historyStack.push(entry);
        if (historyStack.length > maxStackSize) historyStack.shift();
    }
    private static popLayoutHistory(historyStack: Exclude<LayoutHistoryEntry, Tile>[]): boolean {
        if (historyStack.length == 0) return false;
        const entry: Exclude<LayoutHistoryEntry, Tile> = historyStack.pop()!;
        const loadedRoot = new GroupTile();
        const stack: [GroupTile, Exclude<LayoutHistoryEntry, Tile>][] = [[loadedRoot, entry]];
        while (stack.length > 0) {
            const [tile, entry] = stack.pop()!;
            tile.copyProperties(entry.tile);
            tile.size = entry.tile.size;
            tile.label = entry.tile.label;
            for (const child of entry.children) {
                if (child instanceof Tile) {
                    // don't use removeChild since it triggers the obsolete group tile removal
                    if (child.parent !== null) {
                        const i = child.parent.children.indexOf(child);
                        if (i >= -1) child.parent.children.splice(i, 1);
                    }
                    child.parent = null;
                    tile.addChild(child);
                } else {
                    const tile2 = new GroupTile();
                    stack.push([tile2, child]);
                    tile.addChild(tile2);
                }
            }
        }
        // overwrite without using remove/add to avoid breaking tree (these are the same tiles!!)
        for (const child of loadedRoot.children) child.parent = this.root;
        this.root.copyProperties(loadedRoot);
        this.root.children.length = 0;
        this.root.children.push(...loadedRoot.children);
        return true;
    }

    // tile dragging
    static startDrag(tile: Tile, offset?: typeof TileEditor['drag']['offset'], size?: typeof TileEditor['drag']['size'], e?: MouseEvent | TouchEvent): boolean {
        if (this.lock.locked || this.drag.current !== null) return false;
        this.markLayoutChange();
        this.lock.acquire();
        this.redoHistory.length = 0;
        tile.parent?.removeChild(tile);
        this.drag.current = tile;
        this.drag.offset = offset ?? { x: 0, y: 0 };
        this.drag.size = size ?? { w: 200, h: 150 };
        this.drag.drop.tile = null;
        if (e !== undefined) this.updateDrag(e);
        return true;
    }
    private static updateDrag(e: MouseEvent | TouchEvent): void {
        if (this.drag.current === null) return;
        const pos = 'touches' in e ? {
            x: e.touches[0]?.clientX ?? 0,
            y: e.touches[0]?.clientY ?? 0
        } : {
            x: e.clientX,
            y: e.clientY
        };
        // reset
        this.drag.drop.tile = null;
        // sidebar drag and drop switch
        const sidebarThreshold = window.innerWidth - Math.max(this.state.minSidebarWidthPx, window.innerWidth * this.state.sidebarScreenWidth / 100);
        if (this.state.sidebarOpen && this.state.sidebarTab == 'edit' && pos.x >= sidebarThreshold) {
            this.updateDragSidebar(pos);
        } else {
            this.updateDragTiles(pos);
        }
    }
    private static updateDragSidebar(mousePos: { x: number, y: number }): void {
        const pos = mousePos;
        this.drag.sidebarDrop = true;
        // sidebar drag-and-drop is simpler since there are no overlapping bounding boxes caused by groups
        // a simple DFS that goes down the tree, creating groups done by hovering over the left half
        // also allows dropping into position for collapsed tiles because no overlaps
        const stack: Tile[] = [...this.root.children]; // don't drop onto root!
        let currTile: Tile | null = null;
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (curr.sidebarElements === null) {
                console.warn(`${curr.label} sidebar elements are null! Perhaps the sidebar is not open or the tile is not mounted?`);
                continue;
            }
            const handleRect = curr.sidebarElements.handle.getBoundingClientRect();
            if (pos.x >= handleRect.left && pos.x <= handleRect.right && pos.y >= handleRect.top && pos.y <= handleRect.bottom) {
                currTile = curr;
            } else if (curr instanceof GroupTile) {
                const childrenRect = curr.sidebarElements.children?.getBoundingClientRect();
                if (childrenRect !== undefined && pos.x >= childrenRect.left && pos.y <= childrenRect.right && pos.y >= childrenRect.top && pos.y <= childrenRect.bottom) {
                    stack.push(...curr.children);
                }
            }
        }
        if (currTile === null) return;
        // guaranteed to have a handle element by DFS
        const rect = currTile.sidebarElements!.handle.getBoundingClientRect();
        const relX = pos.x - rect.left;
        const relY = pos.y - rect.top;
        this.drag.drop.tile = currTile;
        this.drag.drop.createGroup = relX < rect.width / 2;
        this.drag.drop.insertBefore = relY < rect.height / 2;
        this.drag.drop.newGroupVertical = false; // default
    }
    private static updateDragTiles(mousePos: { x: number, y: number }): void {
        const pos = mousePos;
        this.drag.sidebarDrop = false;
        // border implementation leaves gaps between tiles (tiles don't actually have borders)
        const fixBoundingRect = (rect: DOMRect): DOMRect => {
            const rect2 = {
                top: rect.top - 2,
                bottom: rect.bottom + 2,
                left: rect.left - 2,
                right: rect.right + 2,
                x: rect.x - 2,
                y: rect.y - 2,
                width: rect.width + 4,
                height: rect.height + 4,
            };
            return {
                ...rect2,
                toJSON: () => JSON.stringify(rect2)
            };
        };
        // drop locations are defined by "boxes" on the sides of tiles
        // each box is broken up, further to the edge is insert as sibling, further inward is create group
        // sibling option only exists for edges inline with parent group, otherwise treated as create group
        // bottom-up search - start with leaf node that mouse is within and move up the tree
        // until a drop location is found - will try to place in smallest drop "box" first before
        // moving to larger and larger ones (prevents boxes for group tiles accepting all drops)
        // special cases for collapsed groups exist too
        const stack: Tile[] = [this.root];
        let currTile: Tile | null = null;
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (curr.element === null) {
                console.warn(`${curr.label} element is null! Perhaps the tile is not mounted?`);
                continue;
            }
            const rect = fixBoundingRect(curr.element.getBoundingClientRect());
            if (pos.x >= rect.left - 2 && pos.x <= rect.right + 2 && pos.y >= rect.top - 2 && pos.y <= rect.bottom + 2) {
                currTile = curr;
                if (curr instanceof GroupTile) stack.push(...curr.children);
            }
        }
        if (currTile === null) return;
        while (true) {
            if (currTile.element === null) {
                // parent must be wrong somewhere because the tile has an unmounted parent
                // previous DFS guarantees not null going down, but not back up the tree
                console.warn(`${currTile.label} element is null! Perhaps there is a bug and the parent is set wrong?`)
                break;
            }
            const rect = fixBoundingRect(currTile.element.getBoundingClientRect());
            const relX = pos.x - rect.left;
            const relY = pos.y - rect.top;
            const halfWidth = rect.width / 2;
            const halfHeight = rect.height / 2;
            const halfBoxWidth = Math.min(12 * Math.log(rect.width + 1), rect.width * 0.6);
            const halfBoxHeight = Math.min(12 * Math.log(rect.height + 1), rect.height * 0.6);
            if (currTile.parent?.orientation === GroupTile.COLLAPSED) {
                // center box, special case for collapsed groups - only drop within the group or go to parent
                if (Math.max(Math.abs(relX - halfWidth), Math.abs(relY - halfHeight)) < Math.min(halfWidth, halfHeight) / 2) {
                    this.drag.drop.tile = currTile.parent.children[currTile.parent.children.length - 1];
                    this.drag.drop.insertBefore = false;
                    this.drag.drop.createGroup = false;
                } else if (currTile.parent !== null) {
                    currTile = currTile.parent;
                    continue;
                }
            } else if (relY < halfBoxHeight && relX > halfWidth - halfBoxWidth && relX < halfWidth + halfBoxWidth) {
                // top box
                this.drag.drop.tile = currTile;
                this.drag.drop.insertBefore = true;
                if (relY < halfBoxHeight / 2 && currTile.parent?.orientation === GroupTile.VERTICAL) {
                    this.drag.drop.createGroup = false;
                } else {
                    this.drag.drop.createGroup = true;
                    this.drag.drop.newGroupVertical = true;
                }
            } else if (relY > rect.height - halfBoxHeight && relX && relX > halfWidth - halfBoxWidth && relX < halfWidth + halfBoxWidth) {
                // bottom box
                this.drag.drop.tile = currTile;
                this.drag.drop.insertBefore = false;
                if (relY > rect.height - halfBoxHeight / 2 && currTile.parent?.orientation === GroupTile.VERTICAL) {
                    this.drag.drop.createGroup = false;
                } else {
                    this.drag.drop.createGroup = true;
                    this.drag.drop.newGroupVertical = true;
                }
            } else if (relX < halfBoxWidth && relY > halfHeight - halfBoxHeight && relY < halfHeight + halfBoxHeight) {
                // left box
                this.drag.drop.tile = currTile;
                this.drag.drop.insertBefore = true;
                if (relX < halfBoxWidth / 2 && currTile.parent?.orientation === GroupTile.HORIZONTAL) {
                    this.drag.drop.createGroup = false;
                } else {
                    this.drag.drop.createGroup = true;
                    this.drag.drop.newGroupVertical = false;
                }
            } else if (relX > rect.width - halfBoxWidth && relY > halfHeight - halfBoxHeight && relY < halfHeight + halfBoxHeight) {
                // right box
                this.drag.drop.tile = currTile;
                this.drag.drop.insertBefore = false;
                if (relX > rect.width - halfBoxWidth / 2 && currTile.parent?.orientation === GroupTile.HORIZONTAL) {
                    this.drag.drop.createGroup = false;
                } else {
                    this.drag.drop.createGroup = true;
                    this.drag.drop.newGroupVertical = false;
                }
            } else if (currTile.parent !== null) {
                currTile = currTile.parent;
                continue;
            }
            break;
        }
    }
    static endDrag(): boolean {
        if (this.drag.current === null) return false;
        this.lock.release();
        if (this.drag.drop.tile === null) {
            this.popLayoutHistory(this.undoHistory);
            this.redoHistory.length = 0;
            this.drag.current = null;
            return true;
        }
        const parent = this.drag.drop.tile.parent ?? this.root;
        if (this.drag.drop.createGroup) {
            const newGroup = new GroupTile();
            newGroup.size = this.drag.drop.tile.size;
            if (this.drag.drop.tile == this.root) {
                // special case for root tile, root has no parent and breaks
                newGroup.copyProperties(this.root);
                this.root.orientation = this.drag.drop.newGroupVertical ? GroupTile.VERTICAL : GroupTile.HORIZONTAL;
                // more skipping of normal add/remove functions
                for (const child of this.root.children) child.parent = newGroup;
                newGroup.children.push(...this.root.children);
                this.root.children.length = 0;
                this.root.addChild(newGroup);
                const insertFn = (this.drag.drop.insertBefore ? this.root.insertChildBefore : this.root.insertChildAfter);
                insertFn.call(this.root, this.drag.current, newGroup);
            } else {
                newGroup.copyProperties(parent);
                newGroup.orientation = this.drag.drop.newGroupVertical ? GroupTile.VERTICAL : GroupTile.HORIZONTAL;
                parent.replaceChild(this.drag.drop.tile, newGroup);
                newGroup.addChild(this.drag.drop.tile);
                const insertFn = (this.drag.drop.insertBefore ? newGroup.insertChildBefore : newGroup.insertChildAfter);
                insertFn.call(newGroup, this.drag.current, this.drag.drop.tile);
            }
        } else if (parent.orientation == GroupTile.COLLAPSED && !this.drag.sidebarDrop) {
            // always append to end for collapsed groups except for sidebar drops
            parent.addChild(this.drag.current);
        } else {
            // drop target tile can't be root because updateDrag parent orientation check always fails
            const insertFn = (this.drag.drop.insertBefore ? parent.insertChildBefore : parent.insertChildAfter);
            insertFn.call(parent, this.drag.current, this.drag.drop.tile);
        }
        this.drag.current = null;
        this.drag.drop.tile = null;
        this.redoHistory.length = 0;
        return true;
    }

    // modulator dragging - a bit different as it's less complicated
    static startModulatorDrag<Props extends Modulation.SourcePropertyMap, Key extends keyof Props & string>(source: Modulation.Source<Props>, key: Key): boolean {
        if (this.lock.locked || this.modulatorDrag.source !== null) return false;
        this.lock.acquire();
        this.modulatorDrag.source = source;
        this.modulatorDrag.sourceKey = key;
        this.modulatorDrag.target = null;
        return true;
    }
    static updateModulatorDrag(): void
    static updateModulatorDrag<Props extends Modulation.TargetPropertyMap, Key extends keyof Props & string>(target: Modulation.Target<Props>, key: Key): void
    static updateModulatorDrag<Props extends Modulation.TargetPropertyMap, Key extends keyof Props & string>(target?: Modulation.Target<Props>, key?: Key): void {
        this.modulatorDrag.target = target ?? null;
        this.modulatorDrag.targetKey = key ?? '';
    }
    static endModulatorDrag(): boolean {
        if (this.modulatorDrag.source === null) return false;
        this.lock.release();
        if (this.modulatorDrag.target !== null) this.modulatorDrag.source.connect(this.modulatorDrag.target, this.modulatorDrag.sourceKey, this.modulatorDrag.targetKey);
        this.modulatorDrag.source = null;
        this.modulatorDrag.target = null;
        return true;
    }

    // edit history stack (only for layout changes like through tile drag-and-drop)
    static markLayoutChange(): boolean {
        if (this.lock.locked || this.drag.current !== null) return false;
        this.pushLayoutHistory(this.undoHistory, this.maxLayoutHistory);
        this.redoHistory.length = 0;
        return true;
    }
    static undoLayoutChange(): boolean {
        if (this.lock.locked || this.drag.current !== null || this.undoHistory.length == 0) return false;
        this.pushLayoutHistory(this.redoHistory, this.maxLayoutHistory);
        this.popLayoutHistory(this.undoHistory);
        return true;
    }
    static redoLayoutChange(): boolean {
        if (this.lock.locked || this.drag.current !== null || this.redoHistory.length == 0) return false;
        this.pushLayoutHistory(this.undoHistory, this.maxLayoutHistory);
        this.popLayoutHistory(this.redoHistory);
        return true;
    }
    static clearLayoutStack(): void {
        this.undoHistory.length = 0;
        this.redoHistory.length = 0;
    }

    static {
        watch(() => this.state.sidebarScreenWidth, () => localStorage.setItem('sidebarScreenWidth', this.state.sidebarScreenWidth.toString()));
        // this isn't a vue composable, no lifecycle hooks
        document.addEventListener('mousemove', (e) => this.updateDrag(e), { passive: true });
        document.addEventListener('mouseup', () => (this.endDrag(), this.endModulatorDrag()));
        window.addEventListener('blur', () => (this.endDrag(), this.endModulatorDrag()));
        // wow the undo stack
        document.addEventListener('keydown', (e) => {
            if (this.lock.locked || this.drag.current !== null || matchTextInput(e.target)) return;
            if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        this.undoLayoutChange();
                        break;
                    case 'y':
                        this.redoLayoutChange();
                        break;
                }
            }
        });
        // currentTiles is used everywhere
        watchEffect(() => {
            // somehow this works perfectly and only updates when there is a layout change
            // it triggers multiple times but only runs once because vue isnt stupid and defers it
            this.flattenedTiles.clear();
            const stack: Tile[] = [this.root];
            while (stack.length > 0) {
                const curr = stack.pop()!;
                if (curr instanceof GroupTile) {
                    stack.push(...curr.children);
                }
                this.flattenedTiles.add(curr);
            }
            if (this.drag.current !== null) this.flattenedTiles.add(this.drag.current);
        }, {
            // onTrack: () => console.debug('track flattened tiles'),
            // onTrigger: () => console.debug('trigger flattened tiles change')
        });
    }
}

export default TileEditor;

// tiles that get displayed in drag-and-drop source
TileEditor.registerTile(GroupTile, false);
TileEditor.registerTile(VisualizerTile, true);
TileEditor.registerTile(TextTile, true);
TileEditor.registerTile(ImageTile, true);
TileEditor.registerTile(BeepboxTile, true);
TileEditor.registerTile(Tile, true);
TileEditor.registerTile(GrassTile, false);
