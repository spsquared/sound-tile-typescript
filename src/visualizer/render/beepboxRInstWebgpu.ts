import { AsyncLock } from '@/components/lock';
import type { BeepboxSettingsData } from './beepboxRenderer';
import BeepboxRenderInstance from './beepboxRInstAbstract';
import renderShader from './shaders/render.wgsl?raw';

type BindGroupPair = { readonly layout: GPUBindGroupLayout, readonly group: GPUBindGroup };

class WGPURenderer extends BeepboxRenderInstance {
    readonly ctx: GPUCanvasContext;
    private readonly device: Promise<GPUDevice>;
    private readonly textureFormat: GPUTextureFormat;

    private readonly lock: AsyncLock = new AsyncLock();

    private readonly modules: Promise<{
        // readonly compute: GPUShaderModule
        readonly render: GPUShaderModule
    }>;
    private readonly buffers: Promise<{
        readonly metadata: GPUBuffer
        readonly notes: GPUBuffer
        readonly notesIndex: GPUBuffer
    }>;
    private readonly bindGroups: Promise<{
        readonly placeholder: BindGroupPair
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
        const adapter = navigator.gpu?.requestAdapter();
        this.device = new Promise<GPUDevice>(async (resolve) => {
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
            console.log('GPU limits', gpu.limits);
            resolve(gpu);
        });
        this.modules = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                render: device.createShaderModule({
                    label: import.meta.env.DEV ? 'Render shader' : undefined,
                    code: renderShader
                })
            });
        });
        this.buffers = new Promise(async (resolve) => {
            const device = await this.device;
            resolve({
                metadata: device.createBuffer({
                    label: import.meta.env.DEV ? 'Metadata buffer' : undefined,
                    size: 32,
                    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.UNIFORM | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST
                }),
                notes: device.createBuffer({
                    label: import.meta.env.DEV ? 'Note vertex buffer' : undefined,
                    size: 32,
                    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
                }),
                notesIndex: device.createBuffer({
                    label: import.meta.env.DEV ? 'Note vertex buffer' : undefined,
                    size: 32,
                    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
                })
            });
        });
        this.bindGroups = new Promise(async (resolve) => {
            const device = await this.device;
            const renderBindGroupLayout = device.createBindGroupLayout({
                entries: [
                ]
            });
            resolve({
                placeholder: {
                    layout: renderBindGroupLayout,
                    group: device.createBindGroup({
                        label: import.meta.env.DEV ? 'Render bind group' : undefined,
                        layout: renderBindGroupLayout,
                        entries: [
                        ]
                    })
                }
            });
        });
        this.pipelines = new Promise(async (resolve) => {
            const device = await this.device;
            const modules = await this.modules;
            resolve({
                renderNotes: await device.createRenderPipelineAsync({
                    label: import.meta.env.DEV ? 'Static note render pipeline' : undefined,
                    layout: device.createPipelineLayout({
                        label: import.meta.env.DEV ? 'Static note render pipeline layout' : undefined,
                        bindGroupLayouts: []
                    }),
                    vertex: {
                        module: modules.render,
                        entryPoint: 'vertex_main',
                        constants: {
                        },
                        buffers: [
                            {
                                arrayStride: 8,
                                attributes: [
                                    {
                                        shaderLocation: 0,
                                        format: 'float32x2',
                                        offset: 0
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
                    }
                })
            });
        });
    }

    protected async drawFrame(tick: number): Promise<void> {
        const device = await this.device;
        const buffers = await this.buffers;
        const pipelines = await this.pipelines;
        await this.lock.acquire();
        await device.queue.onSubmittedWorkDone();
        if (this.resized !== undefined) {
            this.canvas.width = this.resized[0];
            this.canvas.height = this.resized[1];
        }
        const encoder = device.createCommandEncoder();
        // no compute pass yet, no particles oof
        const renderPass = encoder.beginRenderPass({
            label: import.meta.env.DEV ? 'Render pass' : undefined,
            colorAttachments: [{
                view: this.ctx.getCurrentTexture().createView(),
                loadOp: 'clear',
                storeOp: 'store',
                clearValue: { r: 0, g: 0, b: 0, a: 0 }
            }]
        });
        renderPass.setPipeline(pipelines.renderNotes);
        renderPass.setVertexBuffer(0, buffers.notes);
        renderPass.setIndexBuffer(buffers.notesIndex, 'uint16');
        renderPass.drawIndexedIndirect(buffers.metadata, 0);
        renderPass.end();
        // submit
        device.queue.submit([encoder.finish()]);
        await device.queue.onSubmittedWorkDone();
        this.lock.release();
        // oof
        this.bindGroups // oof
        tick // oof
    }
}

export default WGPURenderer;
