namespace Trix {
    type direction = 'forward' | 'backward';
    type RangeTuple = [number, number];
    type Location = { index: number, offset: number }
    type LocationRangeTuple = [Location, Location]
    type AttributeValue = string | boolean;
    type AttributeRecord = Record<string, AttributeValue>;

    export class EmptyClass { }

    export class SplittableList { }

    export class Document {
        static fromJSON(json: any[]): Document
        static fromString(string: string, attributes?: AttributeRecord): Document

        constructor(blocks?: Block[]): Document

        isEmpty(): boolean
        isEqualTo(document: Document): boolean
        copy(options?: { consolidateBlocks?: boolean }): Document
        copyUsingObjectsFromDocument(sourceDocument: Document): Document
        copyUsingObjectMap(objectMap: unknown): Document
        copyWithBaseBlockAttributes(blockAttributes: string[]): Document
        replaceBlock(oldBlock: Block, newBlock: Block): Document
        insertDocumentAtRange(document: Document, range: RangeTuple): Document
        mergeDocumentAtRange(document: Document, range: RangeTuple): Document
        insertTextAtRange(text: Text, range: RangeTuple): Document
        removeTextAtRange(range: RangeTuple): Document
        moveTextFromRangeToPosition(range: RangeTuple, position: number): Document
        addAttributeAtRange(attribute: string, value: AttributeValue, range: RangeTuple): Document
        addAttribute(attribute: string, value: AttributeValue): Document
        removeAttributeAtRange(attribute: string, value: AttributeValue, range: RangeTuple): Document
        updateAttributesForAttachment(attributes: nofuckingclue, attachment: Attachment): Document
        removeAttributesForAttachment(attributes: nofuckingclue, attachment: Attachment): Document
        setHTMLAttributeAtPosition(position: number, name: string, value: string): Document // no typo in this one
        insertBlockBreakAtRange(range: RangeTuple): Document
        applyBlockAttributeAtRange(attribute: string, value: AttributeValue, range: RangeTuple): Document
        removeLastListAttributeAtRange(range: RangeTuple, options?: { exceptAttributeName?: boolean }): Document
        removeLastTerminalAttributeAtRange(range: RangeTuple): Document
        removeBlockAttributesAtRange(range: RangeTuple): Document
        expandRangeToLineBreaksAndSplitBlocks(range: RangeTuple): Document
        convertLineBreaksToBlockBreaksInRange(range: RangeTuple): Document
        consolidateBlocksAtRange(range: RangeTuple): Document
        getDocumentAtRange(range: RangeTuple): Document
        getStringAtRange(range: RangeTuple): string
        getBlockAtIndex(index: number): Block
        getBlockAtPosition(position: number): Block
        getTextAtIndex(index: number): Text
        getTextAtPosition(position: number): Text
        getPieceAtPosition(position: number): Piece
        getCharacterAtPosition(position: number): string
        getBlockCount(): number
        getEditCount(): number
        eachBlock(cb: Function): any
        eachBlockAtRange(range: RangeTuple, cb: Function): any
        getCommonAttributesAtRange(range: RangeTuple): AttributeRecord
        getCommonAttributesAtPosition(position: number): AttributeRecord
        getRangeOfCommonAttributeAtPosition(attribute: string, position: number): RangeTuple
        getBaseBlockAttributes(): string[]
        getAttachmentById(attachmentId: number): Attachment | undefined
        getAttachmentPieces(): Piece[]
        getAttachments(): Attachment[]
        getRangeOfAttachment(attachment: Attachment): RangeTuple
        getLocationRangeOfAttachment(attachment: Attachment): LocationRangeTuple
        getAttachmentPieceForAttachment(attachment: Attachment): Piece | undefined
        findRangesForBlockAttribute(attribute: string): RangeTuple[]
        findRangesForTextAttribute(attribute: string, options?: { withValue: AttributeValue }): RangeTuple[]
        locationFromPosition(position: number): Location
        positionFromLocation(location: Location): number
        locationRangeFromPosition(position: number): LocationRangeTuple
        locationRangeFromRange(range: RangeTuple): LocationRangeTuple
        rangeFromLocationRange(locationRange: LocationRangeTuple): RangeTuple
        getLength(): number
        getBlocks(): Block[]
        getTexts(): Text[]
        getPieces(): Piece[]
        getObjects(): (Block | Text | Piece)[]
        toSerializableDocument(): Document
        toString(): string
        toJSON(): string
        toConsole(): string
    }
    export class Block {
        static fromJSON(json: any): Block

        constructor(text?: Text, attributes?: string[], htmlAttributes: AttributeRecord): Block

        isEmpty(): boolean
        isEqualTo(block: Block): boolean
        copyWithText(text: Text): Block
        copyWithoutText(): Block
        copyWithAttributes(attributes: string[]): Block
        copyWithoutAttributes(): Block
        copyUsingObjectMap(objectMap: unknown): Block
        addAttribute(attribute: string): Block
        addHTMLAttribute(attribute: string, value: AttributeValue)
        removeAttribute(attribute: string): Block
        removeLastAttribute(): Block
        getLastAttribute(): string
        getAttributes(): string[]
        getAttributeLevel(): number
        getAttributeAtLevel(level: number): string | undefined
        hasAttribute(attribute: string): boolean
        hasAttributes(): boolean
        getLastNestableAttribute(): string | undefined
        getNestableAttributes(): string[]
        getNestingLevel(): number
        decreaseNestingLevel(): Block
        increaseNestingLevel(): Block
        getListItemAttributes(): string[]
        isListItem(): boolean
        isTerminalBlock(): boolean
        breaksOnReturn(): boolean
        findLineBreakInDirectionFromPosition(direction: direction, position: number): number
        contentsForInspection(): any
        canBeConsolidatedWith(block: Block): boolean
        consolidateWith(block: Block): Block
        splitAtOffset(offset: number): [Block, null] | [null, Block] | [Block, Block]
        getBlockBreakPosition(): number
        getTextWithoutBlockBreak(): Text
        canBeGrouped(depth: number): string | undefined // me when truthy and falsy values used as booleans
        canBeGroupedWith(otherBlock: Block, depth: number): boolean
        getLength(): number
        toString(): string
        toJSON(): string
        getDirection(): 'ltr' | 'rtl'
        isRTL(): boolean
    }
    export class Text {
        static textForAttachmentWithAttributes(attachment: Attachment, attributes: AttributeRecord): Text
        static textForStringWithAttributes(string: string, attributes: AttributeRecord): Text
        static fromJSON(json: any): Text

        constructor(pieces?: Piece[]): Text

        isEmpty(): boolean
        isEqualTo(text: Text): boolean
        isBlockBreak(): boolean
        copy(): Text
        copyWithPieceList(pieceList: SplittableList): Text
        copyUsingObjectMap(objectMap: unknown): Text
        appendText(text: Text): Text
        insertTextAtPosition(text: Text, position: number): Text
        removeTextAtRange(range: RangeTuple): Text
        replaceTextAtRange(text: Text, range: RangeTuple): Text
        moveTextFromRangeToPosition(range: RangeTuple, position: number): Text
        addAttributeAtRange(attribute: string, value: AttributeValue, range: RangeTuple): Text
        addAttributesAtRange(attributes: AttributeRecord, range: RangeTuple): Text
        removeAttributeAtRange(attribute: string, range: RangeTuple): Text
        setAttributeAtRange(attributes: AttributeRecord, range: RangeTuple): Text
        getAttributesAtPosition(position: number): AttributeRecord
        getCommonAttributes(): AttributeRecord
        getExpandedRangeForAttributeAtOffset(attribute: string, offset: number): RangeTuple
        getTextAtRange(range: RangeTuple): Text
        getStringAtRange(range: RangeTuple): string
        getStringAtPosition(position: number): string
        startsWithString(string: string): boolean
        endsWithString(string: string): boolean
        getAttachmentPieces(): Piece[]
        getAttachments(): Attachment[]
        getAttachmentAndPositionById(attachmentId: number): { attachment: Attachment, position: number } | { attachment: null, position: null }
        getAttachmentById(attachmentId: number): Attachment | undefined
        getRangeOfAttachment(attachment: Attachment): RangeTuple
        updateAttributesForAttachment(attributes: AttributeRecord, attachment: Attachment): Text
        getLength(): number
        eachPiece(cb: Function): any
        getPieces(): Piece[]
        getPieceAtPosition(position): Piece
        contentsForInspection(): any
        toSerializableText(): Text
        toString(): string
        toJSON(): string
        toConsole(): string
        getDirection(): 'ltr' | 'rtl'
        isRTL(): boolean
    }
    export class Piece {
        static registerType<P extends Piece>(type: string, constructor: P): void
        static fromJSON(json: any): Piece

        constructor(value: any, attributes: AttributeRecord): Piece

        isEmpty(): boolean
        isEqualTo(piece: Piece): boolean
        isBlockBreak(): boolean
        copy(): Piece
        copyWithAttributes(attributes: AttributeRecord): Piece
        copyWithAdditionalAttributes(attributes: AttributeRecord): Piece
        copyWithoutAttribute(attribute: string): Piece
        getAttribute(attribute: string): AttributeValue | undefined
        getAttributesHash(): unknown // don't care
        getAttributes(): AttributeRecord
        hasAttribute(attribute: string): boolean
        hasSameStringValueAsPiece(piece: Piece): boolean
        hasSameAttributesAsPiece(piece: Piece): boolean
        contentsForInspection(): any
        canBeGrouped(): boolean
        canBeGroupedWith(piece: Piece): boolean
        canBeConsolidatedWith(piece: Piece): boolean
        getLength(): number
        isSerializable(): boolean
        toJSON(): any
    }
    export class Attachment {
        constructor(attributes?: Record<string, any>): Attachment
    }
    export interface Snapshot {
        document: string
        selectedRange: RangeTuple
    }
    export class Filter {
        constructor(document: Document): Filter
        applyBlockAttribute(): void
        removeBlockAttribute(): any
        getSnapshot(): any
        perform(): void
        moveSelectedRangeForware(): void
        findRangesOfBlocks(): any
        findRangesOfPieces(): any
    }

    export class Editor {
        element: TrixEditorElement
        filters: Function[]

        getDocument(): Document
        loadDocument(doc: Document): unknown

        attributeIsActive(attribute: string, value?: AttributeValue): boolean
        canActivateAttribute(attribute: string): boolean
        activateAttribute(attribute: string): boolean
        deactivateAttribute(attribute: string): boolean
        canIncreaseNestingLevel(): boolean
        increaseNestingLevel(): boolean
        canDecreaseNestingLevel(): boolean
        decreaseNestingLevel(): boolean

        getPosition(): number
        getSelectedRange(): RangeTuple
        setSelectedRange(range: RangeTuple): void
        getSelectedDocument(): Document
        moveCursorInDirection(direction: direction): void
        expandSelectionInDirection(direction: direction): void
        deleteInDirection(direction: direction): void
        getClientRectAtPosition(position: number): DOMRect
        setHTMLAtributeAtPosition(position: number, name: string, value: string): void // lol typo

        insertAttachment(attachment: Attachment): void
        insertAttachments(attachments: Attachment[]): void
        insertDocument(document?: Document): void
        insertFile(file: File): void
        insertFiles(files: File[]): void
        insertHTML(html: string): void
        insertLineBreak(): void
        insertString(string: string): void
        insertText(text: Text): void

        recordUndoEntry(description: string, args?: { context?: any, consolidatable?: boolean })
        canRedo(): boolean
        canUndo(): boolean
        undo(): void
        redo(): void

        loadHTML(html?: string): void
        toJSON(): Snapshot
        loadJSON(json: Snapshot): void
        getSnapshot(): Snapshot
        loadSnapshot(snapshot: Snapshot): void
    }

    export class Controller { }
    export class EditorController extends Controller {
        // currentActions: {
        //     [key: string]: boolean | undefined
        // }
        // currentAttributes: {
        //     [key: string]: boolean | undefined
        // }
        editor: Editor
        editorElement: TrixEditorElement
        toolbarController: ToolbarController
    }
    export class ToolbarController extends Controller {
        // actions: {
        //     [key: string]: boolean | undefined
        // }
        // attributes: {
        //     [key: string]: boolean | undefined
        // }
        delegate: EditorController
        element: TrixToolbarElement
    }

    export class TrixEditorElement extends Element {
        editorController: EditorController
    }
    export class TrixToolbarElement extends Element { }

    export interface Trix {
        Attachment: typeof Attachment
        AttachmentManager: typeof EmptyClass
        AttachmentPiece: typeof EmptyClass
        Block: typeof EmptyClass
        Composition: typeof EmptyClass
        Document: typeof Document
        Editor: typeof Editor
        HTMLParser: typeof EmptyClass
        HTMLSanitizer: typeof EmptyClass
        LineBreakInsertion: typeof EmptyClass
        LocationMapper: typeof EmptyClass
        ManagedAttachment: typeof EmptyClass
        Piece: typeof Piece
        PointMapper: typeof EmptyClass
        SelectionManager: typeof EmptyClass
        SplittableList: typeof EmptyClass
        StringPiece: typeof EmptyClass
        Text: typeof Text
        UndoManager: typeof EmptyClass
        VERSION: string
        config: {
            attachments: any
            blockAttributes: any
            browser: any
            css: any
            dompurify: any
            fileSize: any
            input: any
            keyNames: any
            lang: any
            parser: any
            textAttributes: any
            toolbar: any
            undo
        }
        controllers: {
            Controller: typeof Controller
            EditorController: typeof EditorController
            CompositionController: typeof Controller
            AttachmentEditorController: typeof Controller
            Level0InputController: typeof Controller
            InputController: typeof Controller
            Level2InputController: typeof Controller
            ToolbarController: typeof ToolbarController
        }
        core: {}
        elements: {
            TrixEditorElement: typeof TrixEditorElement
            TrixToolbarElement: typeof TrixToolbarElement
        }
        filters: {
            Filter: typeof Filter
            [key: string]: typeof Filter | undefined
        }
        models: {
            Attachment: typeof EmptyClass
            AttachmentManager: typeof EmptyClass
            AttachmentPiece: typeof EmptyClass
            Block: typeof EmptyClass
            Composition: typeof EmptyClass
            Document: typeof Document
            Editor: typeof Editor
            HTMLParser: typeof EmptyClass
            HTMLSanitizer: typeof EmptyClass
            LineBreakInsertion: typeof EmptyClass
            LocationMapper: typeof EmptyClass
            ManagedAttachment: typeof EmptyClass
            Piece: typeof Piece
            PointMapper: typeof EmptyClass
            SelectionManager: typeof EmptyClass
            SplittableList: typeof EmptyClass
            StringPiece: typeof EmptyClass
            Text: typeof Text
            UndoManager: typeof EmptyClass
        }
        observers: any
        operations: any
        views: {
            AttachmentView: typeof EmptyClass
            BlockView: typeof EmptyClass
            DocumentView: typeof EmptyClass
            ObjectView: typeof EmptyClass
            PieceView: typeof EmptyClass
            PreviewableAttachmentView: typeof EmptyClass
            TextView: typeof EmptyClass
        }
    }
}

declare module 'trix' {
    export default {} as Trix.Trix;
}

declare interface TrixEvent extends Event {
    target: Trix.TrixEditorElement | null
    invokingElement: HTMLElement
    action: string
}

declare global {
    interface Window {
        Trix: Trix.Trix;
    }
}
