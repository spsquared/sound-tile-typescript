import { AsyncLock } from '@/components/lock';
import type { BeepboxSettingsData } from './beepboxRenderer';
import BeepboxRenderInstance from './beepboxRInstAbstract';
import BufferMapper from './beepboxWebgpuBufferMapper';
import renderNotesShader from './shaders/renderNotes.wgsl?raw';

class WGPURenderer extends BeepboxRenderInstance {
    readonly ctx: GPUCanvasContext;
    private readonly device: Promise<GPUDevice>;
    private readonly textureFormat: GPUTextureFormat;
    private deviceLost: boolean = false;

    /**This lock is very important. Don't do anything without acquiring it first. */
    private readonly lock: AsyncLock = new AsyncLock(true);

    private readonly viewportMapper: BufferMapper.Viewport

    private readonly modules: Promise<{
        // readonly compute: GPUShaderModule
        readonly render: GPUShaderModule
    }>;
    private readonly buffers: Promise<{
        readonly viewport: GPUBuffer
        instruments: GPUBuffer
        notesVertex: GPUBuffer
        notesIndex: GPUBuffer
    }>;
    private readonly textures: Promise<{
        depth: GPUTexture
        gradients: GPUTexture
    }>;
    private readonly samplers: Promise<{
        readonly linear: GPUSampler
    }>;
    private readonly bindGroupLayouts: Promise<{
        readonly render: GPUBindGroupLayout
        readonly instruments: GPUBindGroupLayout
    }>;
    private readonly bindGroups: Promise<{
        readonly render: GPUBindGroup
        instruments: GPUBindGroup
    }>;
    private readonly pipelines: Promise<{
        readonly renderNotes: GPURenderPipeline
    }>;

    constructor(canvas: OffscreenCanvas, data: BeepboxSettingsData) {
        super(canvas, data);
        this.ctx = this.canvas.getContext('webgpu')!;
        // there is a check for if webgpu exists within "navigator" but it may not work?
        if (this.ctx === null) throw new TypeError('WebGPU not available');
        this.textureFormat = navigator.gpu.getPreferredCanvasFormat();
        this.viewportMapper = new BufferMapper.Viewport(new ArrayBuffer(BufferMapper.Viewport.byteLength));
        const adapter = navigator.gpu?.requestAdapter();
        this.device = new Promise(async (resolve) => {
            const ad = await adapter;
            if (ad === null) throw new TypeError('No compatible WebGPU adapter found');
            const gpu = await ad.requestDevice({
                requiredLimits: {
                }
            });
            this.ctx.configure({
                device: gpu,
                format: this.textureFormat,
                alphaMode: 'premultiplied',
                colorSpace: 'srgb'
            });
            console.debug('GPU limits', gpu.limits);
            console.debug('GPU features', gpu.features);
            resolve(gpu);
            gpu.lost.then(() => {
                this.deviceLost = true;
                this.errorText.push('WebGPU device lost');
            });
        });
        this.modules = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                render: device.createShaderModule({
                    code: renderNotesShader
                })
            });
        });
        const initLock = new AsyncLock(true);
        this.buffers = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                viewport: device.createBuffer({
                    label: 'Viewport buffer',
                    size: BufferMapper.Viewport.byteLength,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
                }),
                instruments: null as any,
                // notes will resize dynamically with number of notes
                notesVertex: device.createBuffer({
                    label: 'Note vertex buffer',
                    size: 128 * BufferMapper.Note.vertexStride,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
                }),
                notesIndex: device.createBuffer({
                    label: 'Note index buffer',
                    size: 128,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
                })
            });
        });
        this.textures = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                depth: device.createTexture({
                    label: 'Depth texture',
                    size: [this.canvas.width, this.canvas.height],
                    format: 'depth24plus',
                    usage: GPUTextureUsage.RENDER_ATTACHMENT
                }),
                gradients: null as any
            });
        });
        this.samplers = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                linear: device.createSampler({
                    label: 'Linear sampler',
                    addressModeU: 'clamp-to-edge',
                    addressModeV: 'clamp-to-edge',
                    magFilter: 'linear',
                    minFilter: 'linear',
                    mipmapFilter: 'linear'
                })
            })
        });
        this.bindGroupLayouts = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                render: device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.VERTEX,
                            buffer: { type: 'uniform' }
                        },
                        {
                            binding: 1,
                            visibility: GPUShaderStage.FRAGMENT,
                            sampler: { type: 'filtering' }
                        },
                    ]
                }),
                instruments: device.createBindGroupLayout({
                    entries: [
                        {
                            binding: 0,
                            visibility: GPUShaderStage.VERTEX,
                            buffer: { type: 'read-only-storage' }
                        },
                        {
                            binding: 1,
                            visibility: GPUShaderStage.FRAGMENT,
                            texture: { viewDimension: '2d-array' }
                        }
                    ]
                })
            });
        });
        this.bindGroups = new Promise(async (resolve) => {
            const device = await this.device;
            const buffers = await this.buffers;
            const textures = await this.textures;
            const samplers = await this.samplers;
            const bindGroupLayouts = await this.bindGroupLayouts;
            await initLock.acquire();
            initLock.release();
            resolve({
                render: device.createBindGroup({
                    label: 'General render bind group',
                    layout: bindGroupLayouts.render,
                    entries: [
                        {
                            binding: 0,
                            resource: buffers.viewport
                        },
                        {
                            binding: 1,
                            resource: samplers.linear
                        }
                    ]
                }),
                instruments: device.createBindGroup({
                    label: 'Static note render dynamic instrument data bind group',
                    layout: bindGroupLayouts.instruments,
                    entries: [
                        {
                            binding: 0,
                            resource: buffers.instruments
                        },
                        {
                            binding: 1,
                            resource: textures.gradients
                        }
                    ]
                })
            });
        });
        this.pipelines = new Promise(async (resolve) => {
            const device = await this.device;
            const modules = await this.modules;
            const bindGroupLayouts = await this.bindGroupLayouts;
            resolve({
                renderNotes: await device.createRenderPipelineAsync({
                    label: 'Static note render pipeline',
                    layout: device.createPipelineLayout({
                        bindGroupLayouts: [
                            bindGroupLayouts.render,
                            bindGroupLayouts.instruments
                        ]
                    }),
                    vertex: {
                        module: modules.render,
                        entryPoint: 'vertex_main',
                        constants: {
                        },
                        buffers: [
                            {
                                arrayStride: BufferMapper.Note.vertexStride,
                                attributes: [
                                    {
                                        shaderLocation: 0,
                                        format: 'float32x3',
                                        offset: 0
                                    },
                                    {
                                        shaderLocation: 1,
                                        format: 'uint32',
                                        offset: 12
                                    },
                                ],
                                stepMode: 'vertex'
                            }
                        ],
                    },
                    fragment: {
                        module: modules.render,
                        entryPoint: 'fragment_main',
                        constants: {
                        },
                        targets: [
                            {
                                format: this.textureFormat,
                                blend: {
                                    color: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
                                    alpha: { operation: 'add', srcFactor: 'one', dstFactor: 'one-minus-src-alpha' }
                                }
                            }
                        ]
                    },
                    primitive: {
                        topology: 'triangle-strip',
                        stripIndexFormat: 'uint16'
                    },
                    depthStencil: {
                        depthWriteEnabled: true,
                        depthCompare: 'greater', // reverse-Z method
                        format: 'depth24plus'
                    }
                })
            });
        });
        this.updateInstrumentResources().then(() => {
            initLock.release();
            this.lock.release();
        });
    }

    protected async drawFrame(tick: number): Promise<void> {
        if (this.deviceLost) {
            this.debugText.push('Frame abort due to lost WebGPU device');
            return;
        }
        const device = await this.device;
        const buffers = await this.buffers;
        const textures = await this.textures;
        const bindGroups = await this.bindGroups;
        const pipelines = await this.pipelines;
        await this.lock.acquire();
        await device.queue.onSubmittedWorkDone();
        if (this.resized !== undefined) {
            this.canvas.width = Math.max(1, Math.min(this.resized[0], device.limits.maxTextureDimension2D));
            this.canvas.height = Math.max(1, Math.min(this.resized[1], device.limits.maxTextureDimension2D));
            textures.depth.destroy();
            textures.depth = device.createTexture({
                size: [this.canvas.width, this.canvas.height],
                format: 'depth24plus',
                usage: GPUTextureUsage.RENDER_ATTACHMENT
            });
        }
        await this.updateAndSendGeometry(tick);
        device.queue.writeBuffer(buffers.viewport, 0, this.viewportMapper.buffer);
        const encoder = device.createCommandEncoder();
        // no compute pass yet, no particles oof
        const renderPass = encoder.beginRenderPass({
            label: 'Static note render pass',
            colorAttachments: [{
                view: this.ctx.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0, g: 0, b: 0, a: 0 }
            }],
            depthStencilAttachment: {
                view: textures.depth.createView(),
                depthLoadOp: 'clear',
                depthStoreOp: 'store',
                depthClearValue: 1
            }
        });
        renderPass.setPipeline(pipelines.renderNotes);
        renderPass.setBindGroup(0, bindGroups.render);
        renderPass.setBindGroup(1, bindGroups.instruments);
        renderPass.setVertexBuffer(0, buffers.notesVertex);
        renderPass.setIndexBuffer(buffers.notesIndex, 'uint16');
        renderPass.drawIndexed(10);
        renderPass.end();
        // submit
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        this.lock.release();
    }

    protected async updateAndSendGeometry(tick: number): Promise<void> {
        // get visible bars for all channels
        // if the bars changed generate missing geometry and rebuild vertex and index buffers
        // all textures and instrument styles are pre-generated and constant
        tick
    }

    private async updateInstrumentResources(): Promise<void> {
        const device = await this.device;
        const buffers = await this.buffers;
        const textures = await this.textures;
        // build static instrument styles
        const instruments: BufferMapper.Instrument[] = [];
        for (const channel of this.data.channelStyles) {
            const instrStyles = channel.separateInstrumentStyles ? channel.instruments : [channel.instruments[0]];
            for (const instr of instrStyles) {
                instruments.push({
                    parallax: channel.parallax,
                    foreground: instr.noteColor,
                    background: instr.enableBackground ? instr.noteBackground : undefined
                });
            }
        }
        if (instruments.length > device.limits.maxTextureArrayLayers) {
            console.error('Maximum instrument styles reached!');
            this.errorText.push('Maximum instrument styles reached; some instruments will not have colors!');
        }
        const { buffer, textures: textureBuffers } = BufferMapper.Instrument.writeInstruments(instruments);
        // the buffer initialization step is here to deduplicate some code in the init
        // this adds nulls in places they shouldn't be so obey the fucking lock
        const fudgedByteLength = Math.max(BufferMapper.Instrument.stride, buffer.byteLength); // no 0 length
        if (buffers.instruments === null || buffers.instruments.size != fudgedByteLength) buffers.instruments = device.createBuffer({
            label: 'Instrument styles buffer',
            size: fudgedByteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        device.queue.writeBuffer(buffers.instruments, 0, buffer);
        const layers = Math.max(1, instruments.length);
        if (textures.gradients === null || textures.gradients.depthOrArrayLayers != layers) textures.gradients = device.createTexture({
            label: 'Note gradient texture',
            dimension: '2d',
            textureBindingViewDimension: '2d-array',
            size: {
                width: BufferMapper.Instrument.mips[0][0],
                height: BufferMapper.Instrument.mips[0][1],
                depthOrArrayLayers: BufferMapper.Instrument.mipLevels
            },
            mipLevelCount: BufferMapper.Instrument.mipLevels,
            format: 'rgba8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        });
        if (instruments.length > 0) {
            for (let i = 0; i < textureBuffers.length; i++) {
                for (let j = 0; j < textureBuffers[i].length; j++) {
                    device.queue.writeTexture({
                        texture: textures.gradients,
                        mipLevel: j
                    }, textureBuffers[i][j], {
                        bytesPerRow: BufferMapper.Instrument.mips[j][0] * 4,
                        rowsPerImage: BufferMapper.Instrument.mips[j][1]
                    }, {
                        width: BufferMapper.Instrument.mips[j][0],
                        height: BufferMapper.Instrument.mips[j][1]
                    });
                }
            }
        }
    }

    protected async onDataUpdated(): Promise<void> {
        const device = await this.device;
        await this.lock.acquire();
        await device.queue.onSubmittedWorkDone();
        await this.updateInstrumentResources();
        this.lock.release();
    }

    async destroy(): Promise<void> {
        const device = await this.device;
        await this.lock.acquire();
        await device.queue.onSubmittedWorkDone();
        device.destroy();
        // and now the lock is permanently locked
    }
}

export default WGPURenderer;
