function createShootingStar() {
  // Create a shooting star element
  const star = document.createElement("div");
  star.classList.add("shooting-star");

  // Random starting position at the top of the screen
  const startX = Math.random() * window.innerWidth;
  const startY = Math.random() * 200; // Limit to the top 200px of the screen

  // Set initial position
  star.style.left = `${startX}px`;
  star.style.top = `${startY}px`;

  // Append the shooting star to the body
  document.body.appendChild(star);

  // Remove the shooting star after the animation ends
  star.addEventListener("animationend", () => {
    document.body.removeChild(star);
  });
}

function startShootingStars() {
  setInterval(() => {
    createShootingStar();
  }, 400); // Add a new shooting star every 400ms
}

// Start the animation
startShootingStars();
