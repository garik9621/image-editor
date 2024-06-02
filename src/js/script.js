import ImageEditor from "./imageRedactor.js";

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('image');
    const redactor = new ImageEditor('#canvas');


    fileInput?.addEventListener('input', (e) => {
        const file = e.target.files[0];

        redactor.loadImage(file);
    });
});