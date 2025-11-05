document.addEventListener('DOMContentLoaded', () => {

    // 1. Create the glow element
    const glow = document.createElement('div');
    glow.classList.add('cursor-glow');

    // --- FIX FOR THE OFFSET ---
    // We must force the element's base position to (0,0)
    // so the 'transform' property works from a known origin.
    glow.style.position = 'absolute';
    glow.style.top = '0';
    glow.style.left = '0';
    // --- End of Fix ---

    document.body.appendChild(glow);

    // --- Animation Variables ---
    let targetX = 0;
    let targetY = 0;
    let currentX = -100; // Start off-screen
    let currentY = -100; // Start off-screen
    const easingFactor = 0.05; // Adjust this for speed

    // --- Event Listeners ---
    document.addEventListener('mousemove', (e) => {
        targetX = e.pageX;
        targetY = e.pageY;
        glow.style.opacity = '1';
    });

    document.addEventListener('mouseleave', () => {
        glow.style.opacity = '0';
    });

    // --- The Animation Loop ---
    function tick() {
        const deltaX = targetX - currentX;
        const deltaY = targetY - currentY;

        currentX += deltaX * easingFactor;
        currentY += deltaY * easingFactor;

        // Apply the transform, centering the 30px element (-15px)
        glow.style.transform = `translate3d(${currentX - 15}px, ${currentY - 15}px, 0)`;

        requestAnimationFrame(tick);
    }

    // Start the animation loop
    tick();

});