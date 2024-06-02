export default class ImageEditor {
    ctx
    canvas
    filteredImageData
    image
    imageWidth
    imageHeight
    imageRight
    imageBottom
    imageX = 0
    imageY = 0
    offsetX = 0
    offsetY = 0
    isDragging = false
    startX
    startY
    aspectRatio
    scale = 1
    brightness = 100
    contrast = 100
    saturation = 100
    inversion = 0
    rotation = 0
    blur = 0
    hue = 0
    light = 70

    constructor(canvasId) {
        this.canvas = document.querySelector(canvasId);
        this.ctx = this.canvas.getContext("2d");

        this.init();
    }

    loadImage(file) {
        const imageURL = URL.createObjectURL(file)
        this.image = new Image();
        this.image.crossOrigin = "anonymous";

        this.image.onload = () => {
            this.imageWidth = this.image.width;
            this.imageHeight = this.image.height;

            this.aspectRatio = this.imageWidth /  this.imageHeight;

            if (this.aspectRatio >= 1) {
                this.imageHeight = this.canvas.height;
                this.imageWidth = Math.floor(this.imageHeight * this.aspectRatio);
            } else {
                this.imageWidth = this.canvas.width;
                this.imageHeight = Math.floor(this.imageWidth / this.aspectRatio);
            }

            this.imageRight = this.imageX + this.imageWidth;
            this.imageBottom = this.imageY + this.imageHeight;

            this.applyFilters();

            this.draw()
        }

        this.image.src = imageURL;
    }

    applyMidtonesAdjustment(bufferImageData) {
        const adjustment = parseInt(this.light, 10);

        const lookupTable = this.createMidtonesLookupTable(adjustment);

        for (let i = 0; i < bufferImageData.data.length; i += 4) {
            let red = bufferImageData.data[i];
            let green = bufferImageData.data[i + 1];
            let blue = bufferImageData.data[i + 2];

            red = lookupTable[bufferImageData.data[i]];
            green = lookupTable[bufferImageData.data[i + 1]];
            blue = lookupTable[bufferImageData.data[i + 2]];

            bufferImageData.data[i] = red;
            bufferImageData.data[i + 1] = green;
            bufferImageData.data[i + 2] = blue;
        }
    };

    createMidtonesLookupTable(midLevel) {
        const lookupTable = new Uint8Array(256);

        for (let i = 0; i < 256; i++) {
            let value = 255 * Math.pow(i / 255, Math.log(midLevel / 154) / Math.log(0.5));
            value = Math.min(255, Math.max(0, value));
            lookupTable[i] = value;
        }

        return lookupTable;
    }
    applyFilters() {
        const bufferCanvas = document.createElement('canvas');
        const bufferCtx = bufferCanvas.getContext('2d');

        bufferCanvas.width = this.imageWidth;
        bufferCanvas.height = this.imageHeight;

        bufferCtx.drawImage(this.image, 0, 0, this.imageWidth, this.imageHeight);

        let bufferImageData = bufferCtx.getImageData(0, 0, this.imageWidth, this.imageHeight);

        this.applyMidtonesAdjustment(bufferImageData);

        bufferCtx.putImageData(bufferImageData, 0, 0);

        this.filteredImageData = bufferCanvas;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2)
        this.ctx.rotate(this.rotation);
        this.ctx.filter = `brightness(${this.brightness}%)contrast(${this.contrast}%)saturate(${this.saturation}%)invert(${this.inversion}%) blur(${this.blur}px)hue-rotate(${this.hue}deg)`;
        this.ctx.drawImage(this.filteredImageData, this.imageX - (this.canvas.width / 2) + this.offsetX, this.imageY - (this.canvas.height / 2) + this.offsetY, this.imageWidth * this.scale, this.imageHeight * this.scale);
        this.ctx.restore();
    }

    isMouseUnderCursor(mousePosition) {
        return (
            mousePosition.x >= this.imageX
            && mousePosition.x <= this.imageX + this.imageWidth
            && mousePosition.y >= this.imageY
            && mousePosition.y <= this.imageY + this.imageHeight
        );
    }

    getMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();

        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        }
    }

    handleMouseDown(e) {
        const mousePosition = this.getMousePosition(e);

        if (!this.isMouseUnderCursor(mousePosition)) {
            return;
        }

        this.startX = mousePosition.x - this.imageX;
        this.startY = mousePosition.y - this.imageY;

        this.isDragging = true;
    }

    handleMouseUp() {
        this.isDragging = false;
    }

    handleMouseMove(e) {
        if (!this.isDragging) {
            return;
        }

        const mousePosition = this.getMousePosition(e);

        const offsetX = mousePosition.x - this.startX;
        const offsetY = mousePosition.y - this.startY;

        const cos = Math.cos(this.rotation);
        const sin = Math.sin(this.rotation);

        const nextPositionX = offsetX * cos + offsetY * sin;
        const nextPositionY = -offsetX * sin + offsetY * cos;

        const xBorder = (this.imageWidth * this.scale * Math.abs(Math.cos(this.rotation)));
        const yBorder = (this.imageHeight * this.scale * Math.abs(Math.cos(this.rotation)));

        this.imageX = nextPositionX;
        this.imageY = nextPositionY;

        // Ограничение по границам канваса с учетом поворота
        const corners = [
            { x: this.imageX, y: this.imageY },
            { x: this.imageX + this.imageWidth * this.scale * cos, y: this.imageY + this.imageWidth * this.scale * sin },
            { x: this.imageX - this.imageHeight * this.scale * sin, y: this.imageY + this.imageHeight * this.scale * cos },
            { x: this.imageX + this.imageWidth * this.scale * cos - this.imageHeight * this.scale * sin, y: this.imageY + this.imageWidth * this.scale * sin + this.imageHeight * this.scale * cos }
        ];

        const xs = corners.map(corner => corner.x);
        const ys = corners.map(corner => corner.y);

        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        // Корректируем движение по осям с учетом границ канваса
        if (minX > 0) {
            this.imageX -= minX;
        } else if (maxX < this.canvas.width) {
            this.imageX += this.canvas.width - maxX;
        }
        if (minY > 0) {
            this.imageY -= minY;
        } else if (maxY < this.canvas.height) {
            this.imageY += this.canvas.height - maxY;
        }

        this.draw();
    }

    handleMouseOut() {
        this.isDragging = false;
    }

    initMouseEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseout', (e) => this.handleMouseOut(e));
    }

    recalcImageParamsWithZoom() {
        const newWidth = this.imageWidth * this.scale;
        const newHeight = this.imageHeight * this.scale;

        const dx = (this.imageWidth - newWidth) / 2;
        const dy = (this.imageHeight - newHeight) / 2;

        this.offsetX = dx;
        this.offsetY = dy;
    }

    initFiltersEvents() {
        const brightnessSlider = document.getElementById('brightness');
        const contrastSlider = document.getElementById('contrast');
        const saturationSlider = document.getElementById('saturation');
        const inversionSlider = document.getElementById('inversion');
        const blurSlider = document.getElementById('blur');
        const hueSlider = document.getElementById('hue');
        const midtoneSlider = document.getElementById('light');
        const zoomIn = document.getElementById('zoom-in');
        const zoomOut = document.getElementById('zoom-out');

        brightnessSlider?.addEventListener('input', () => {
            console.log('123')
            this.brightness = parseFloat(brightnessSlider.value);
            this.applyFilters();
            this.draw();
        });

        contrastSlider?.addEventListener('input', () => {
            this.contrast = parseFloat(contrastSlider.value);
            this.applyFilters();
            this.draw();
        });

        saturationSlider?.addEventListener('input', () => {
            this.saturation = parseFloat(saturationSlider.value);
            this.applyFilters();
            this.draw();
        });

        inversionSlider?.addEventListener('input', () => {
            this.inversion = parseFloat(inversionSlider.value);
            this.applyFilters();
            this.draw();
        });

        blurSlider?.addEventListener('input', () => {
            this.blur = parseFloat(blurSlider.value);
            this.applyFilters();
            this.draw();
        });

        hueSlider?.addEventListener('input', () => {
            this.hue = parseFloat(hueSlider.value);
            this.applyFilters();
            this.draw();
        });

        midtoneSlider?.addEventListener('input', () => {
            this.light = parseFloat(midtoneSlider.value);
            this.applyFilters();
            this.draw();
        });

        zoomIn?.addEventListener('click', () => {
            this.scale += 0.03;
            this.recalcImageParamsWithZoom();
            this.draw();
        })

        zoomOut?.addEventListener('click', () => {
            this.scale -= 0.03;

            if (this.scale < 1) {
                this.scale = 1;
            }
            this.recalcImageParamsWithZoom();
            this.draw();
        });
    }

    init() {
        this.initMouseEvents();
        this.initFiltersEvents();
    }
}
