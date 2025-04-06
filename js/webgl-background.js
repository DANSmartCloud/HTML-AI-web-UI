class WebGLBackground {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'fixed top-0 left-0 w-full h-full -z-10';
        this.canvas.style.opacity = '0.1'; // 降低背景透明度
        document.body.insertBefore(this.canvas, document.body.firstChild);
        
        this.gl = this.canvas.getContext('webgl2');
        if (!this.gl) {
            console.warn('WebGL2 not supported, falling back to static background');
            return;
        }

        this.dimensions = { width: 0, height: 0 };
        this.time = 0;
        
        this.initShaders();
        this.initBuffers();
        this.resize();
        this.addEventListeners();
        this.animate();
    }

    initShaders() {
        const vertexShader = `#version 300 es
            in vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `;

        const fragmentShader = `#version 300 es
            precision highp float;
            uniform float uTime;
            out vec4 fragColor;
            
            void main() {
                vec2 uv = gl_FragCoord.xy / 1000.0;
                float pattern = sin(uv.x * 10.0 + uTime * 0.001) * 
                              sin(uv.y * 10.0 + uTime * 0.001) * 0.5 + 0.5;
                fragColor = vec4(vec3(0.5, 0.7, 1.0) * pattern, 0.1);
            }
        `;

        const vs = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vs, vertexShader);
        this.gl.compileShader(vs);

        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fs, fragmentShader);
        this.gl.compileShader(fs);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);
        this.gl.useProgram(this.program);

        this.timeLocation = this.gl.getUniformLocation(this.program, 'uTime');
    }

    initBuffers() {
        // Create a full-screen quad
        const vertices = new Float32Array([
            -1.0, -1.0,
             1.0, -1.0,
            -1.0,  1.0,
             1.0,  1.0
        ]);

        const vbo = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, 'position');
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);
    }

    resize() {
        const { width, height } = this.canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        this.dimensions = { width, height };
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mousePosition = {
                x: (e.clientX - rect.left) / rect.width * 2 - 1,
                y: -(e.clientY - rect.top) / rect.height * 2 + 1
            };
        });
    }

    animate() {
        this.time += 0.5; // 降低动画速度

        this.gl.uniform1f(this.timeLocation, this.time);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize background when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 检查是否是低性能设备
        if (window.utils && window.utils.detectPerformanceGrade() === 'low') {
            return; // 低性能设备不启用WebGL背景
        }
        new WebGLBackground();
    });
} else {
    if (window.utils && window.utils.detectPerformanceGrade() !== 'low') {
        new WebGLBackground();
    }
}