// Company data - keep as is since it's configuration data
const companyData = {
  florida: {
    name: "Island Bitcoin LLC",
    description:
      "Specializing in innovative Bitcoin software development, our Florida-based team creates cutting-edge solutions that empower individuals and businesses in the Bitcoin ecosystem.",
    link: "companies.html#florida",
  },
  "el-salvador": {
    name: "Island Bitcoin S.A de C.V.",
    description: "Our El Salvador division focuses on Bitcoin payment infrastructure and financial inclusion initiatives across Central America.",
    link: "companies.html#el-salvador",
  },
  jamaica: {
    name: "Island Bitcoin Jamaica Limited",
    description: "Leading Caribbean Bitcoin education and adoption through community-focused programs and local merchant solutions.",
    link: "companies.html#jamaica",
  },
  delaware: {
    name: "Taddesse Inc.",
    description: "Our corporate headquarters coordinating global strategy and investment across the Taddesse ecosystem of companies.",
    link: "companies.html#delaware",
  },
  foundation: {
    name: "Island Bitcoin Foundation",
    description: "A non-profit organization dedicated to promoting financial literacy, Bitcoin education, and sustainable development initiatives.",
    link: "companies.html#foundation",
  },
};

// Cache DOM selectors at the top level to reduce DOM queries
document.addEventListener("DOMContentLoaded", function () {
  // Cache DOM elements
  const parallaxContainer = document.getElementById("parallax-container");
  const islandImage = document.getElementById("island-image");
  const heroContent = document.querySelector(".hero-content");
  const particlesContainer = document.getElementById("particles");
  const markers = document.querySelectorAll(".map-marker");
  const popup = document.getElementById("company-popup");
  const popupTitle = document.getElementById("popup-title");
  const popupDescription = document.getElementById("popup-description");
  const popupLink = document.getElementById("popup-link");
  const closePopup = document.getElementById("close-popup");
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileNavOverlay = document.getElementById("mobile-nav-overlay");
  const mobileNavLinks = document.querySelectorAll(".mobile-nav-links a");

  // Initialize UI
  heroContent.classList.add("animate-in");

  // Set up all components
  createParticles(particlesContainer);
  setupCompanyIcons();
  setupMarkers(markers, popup, popupTitle, popupDescription, popupLink, closePopup);
  setupIslandInteraction(parallaxContainer, islandImage);
  setupMobileMenu(mobileMenuToggle, mobileNav, mobileNavOverlay, mobileNavLinks);

  // Run mobile optimizations
  adjustViewportForMobile(particlesContainer);

  // Throttled resize handler
  let resizeTimeout;
  window.addEventListener(
    "resize",
    function () {
      // Throttling to improve performance
      if (!resizeTimeout) {
        resizeTimeout = setTimeout(function () {
          resizeTimeout = null;
          adjustViewportForMobile(particlesContainer);
        }, 250);
      }
    },
    { passive: true }
  );

  console.log("Island Bitcoin site loaded successfully!");
});

// Track mouse position globally - use requestAnimationFrame for efficiency
let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let ticking = false;

document.addEventListener(
  "mousemove",
  (e) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        ticking = false;
      });
      ticking = true;
    }
  },
  { passive: true }
);

function setupCompanyIcons() {
  // This is already efficient - direct DOM manipulation is fine for one-time setup
  const iconMap = {
    "florida-icon": '<i class="fas fa-sun fa-lg" style="color: white;"></i>',
    "el-salvador-icon": '<i class="fab fa-bitcoin fa-lg" style="color: white;"></i>',
    "jamaica-icon": '<i class="fas fa-umbrella-beach fa-lg" style="color: white;"></i>',
    "delaware-icon": '<i class="fas fa-building fa-lg" style="color: white;"></i>',
    "foundation-icon": '<i class="fas fa-graduation-cap fa-lg" style="color: white;"></i>',
  };

  // Replace with more efficient loop
  Object.entries(iconMap).forEach(([id, html]) => {
    const element = document.getElementById(id);
    if (element) element.outerHTML = html;
  });
}

// Optimize particle creation - reduce reflows
function createParticles(container) {
  if (!container) return;

  const particleCount = 15;
  const isMobile = window.innerWidth <= 768;
  const actualCount = isMobile ? 8 : particleCount; // Fewer particles on mobile

  // Create document fragment to minimize DOM operations
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < actualCount; i++) {
    const particle = document.createElement("div");
    particle.classList.add("particle");

    // Increased size range
    const size = Math.random() * 2000 + 2000;
    const posX = Math.random() * 150 - 50;
    const posY = Math.random() * 150 - 50;

    // Set all styles at once
    Object.assign(particle.style, {
      width: `${size}px`,
      height: `${size}px`,
      left: `${posX}%`,
      top: `${posY}%`,
      background: `radial-gradient(
          circle,
          rgba(153, 102, 204, 0.9) 20%,
          rgba(255,255,255, 0.6) 60%,
          rgba(255,255,255, 0) 90%
        )`,
      boxShadow: "0 0 80px rgba(255,165,0, 0.1)",
    });

    // Store original position as data attributes
    particle.dataset.origX = posX;
    particle.dataset.origY = posY;

    fragment.appendChild(particle);
  }

  // Append all particles at once
  container.appendChild(fragment);

  // Start animation on all particles
  const particles = container.querySelectorAll(".particle");
  particles.forEach(animateParticle);
}

// Optimize particle animation with requestAnimationFrame
function animateParticle(particle) {
  // Cache values from dataset to avoid DOM access in animation loop
  const origX = parseFloat(particle.dataset.origX) + 100;
  const origY = parseFloat(particle.dataset.origY) - 10;
  const offsetX = (Math.random() - 0.5) * 20;
  const offsetY = (Math.random() - 0.5) * 20;

  // Current position as variables instead of repeatedly accessing DOM
  let currentX = origX;
  let currentY = origY;

  // Store original glow
  const originalGlow = "0 0 80px rgba(255,165,0, 0.1)";

  // Use a single function for the animation loop
  function animate() {
    // Get viewport dimensions for percentage calculations
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;

    // Convert mouse position to percentage of viewport
    const mouseXPercent = (mouseX / viewWidth) * 100;
    const mouseYPercent = (mouseY / viewHeight) * 100;

    // Calculate target position with optimized math operations
    const mouseInfluence = 0.3;
    const targetX = origX * (1 - mouseInfluence) + mouseXPercent * mouseInfluence + offsetX;
    const targetY = origY * (1 - mouseInfluence) + mouseYPercent * mouseInfluence + offsetY;

    // Smoothly move toward the target position (easing)
    const easeFactor = 0.04;
    currentX += (targetX - currentX) * easeFactor;
    currentY += (targetY - currentY) * easeFactor;

    // Calculate distance efficiently
    const distX = mouseXPercent - currentX;
    const distY = mouseYPercent - currentY;
    const distance = Math.sqrt(distX * distX + distY * distY);

    // Apply glow effect based on distance to mouse - only change style if needed
    if (distance < 30) {
      const proximity = 1 - distance / 30;
      const glowIntensity = 0.1 + proximity * 0.3;
      const glowSize = 80 + proximity * 100;
      particle.style.boxShadow = `0 0 ${glowSize}px rgba(255,165,0, ${glowIntensity})`;
    } else if (particle.style.boxShadow !== originalGlow) {
      particle.style.boxShadow = originalGlow;
    }

    // Apply position changes - use transform instead of left/top for better performance
    particle.style.transform = `translate(${currentX - origX}%, ${currentY - origY}%)`;

    // Continue the animation
    requestAnimationFrame(animate);
  }

  // Start the animation
  requestAnimationFrame(animate);
}

// Fixed marker setup function that maintains performance while ensuring popups work
function setupMarkers(markers, popup, popupTitle, popupDescription, popupLink, closePopup) {
  // Exit early if elements don't exist
  if (!markers.length || !popup) return;

  const mapContainer = document.querySelector(".map-container");

  // Revert to individual marker listeners for reliability
  markers.forEach((marker) => {
    marker.addEventListener("click", function (event) {
      event.stopPropagation();
      const id = this.id.replace("-marker", "");
      const company = companyData[id];

      if (company) {
        // Update popup content
        popupTitle.textContent = company.name;
        popupDescription.textContent = company.description;
        popupLink.href = company.link;

        // Position popup
        if (window.innerWidth <= 768) {
          // Center popup for mobile
          popup.style.left = "50%";
          popup.style.top = "50%";
          popup.style.transform = "translate(-50%, -50%)";
        } else {
          // Desktop positioning
          const rect = this.getBoundingClientRect();
          const mapRect = mapContainer.getBoundingClientRect();

          let left = rect.left - mapRect.left + 30;
          let top = rect.top - mapRect.top;

          if (left + 320 > mapRect.width) {
            left = rect.left - mapRect.left - 330;
          }

          popup.style.left = `${left}px`;
          popup.style.top = `${top}px`;
          popup.style.transform = "none";
        }

        // Show popup
        popup.classList.add("visible");
      }
    });
  });

  // Close popup handlers (unchanged)
  if (closePopup) {
    closePopup.addEventListener("click", function (event) {
      event.stopPropagation();
      popup.classList.remove("visible");
    });
  }

  // Document click to close popup
  document.addEventListener("click", function (event) {
    if (!popup.contains(event.target) && !event.target.closest(".map-marker")) {
      popup.classList.remove("visible");
    }
  });
}

// Optimize island interaction
function setupIslandInteraction(parallaxContainer, islandImage) {
  if (!parallaxContainer || !islandImage) return;

  // Make the island image grayscale by default
  islandImage.style.filter = "grayscale(1)";

  // Create the color spotlight div - create and configure only once
  const colorSpotlight = document.createElement("div");
  colorSpotlight.className = "color-spotlight";
  colorSpotlight.style.display = "none";

  // Clone the island image for the spotlight - do once
  const spotlightImage = islandImage.cloneNode(true);
  spotlightImage.style.filter = "none"; // Full color
  spotlightImage.id = "spotlight-image";

  // Build the DOM structure only once
  colorSpotlight.appendChild(spotlightImage);
  parallaxContainer.appendChild(colorSpotlight);

  // Check device type once
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Cache transform values and use requestAnimationFrame
  let currentRotateX = 0;
  let currentRotateY = 0;
  let currentRotateZ = 0;
  let targetRotateX = 0;
  let targetRotateY = 0;
  let targetRotateZ = 0;
  let animating = false;
  const root = document.documentElement;

  function updateTransform() {
    // Smooth animation with small steps
    currentRotateX += (targetRotateX - currentRotateX) * 0.1;
    currentRotateY += (targetRotateY - currentRotateY) * 0.1;
    currentRotateZ += (targetRotateZ - currentRotateZ) * 0.1;

    const transform = `
        perspective(1000px)
        rotateX(${currentRotateX}deg)
        rotateY(${currentRotateY}deg)
        rotateZ(${currentRotateZ}deg)
        scale(0.9)
      `;

    parallaxContainer.style.transform = transform;

    if (Math.abs(targetRotateX - currentRotateX) > 0.01 || Math.abs(targetRotateY - currentRotateY) > 0.01 || Math.abs(targetRotateZ - currentRotateZ) > 0.01) {
      requestAnimationFrame(updateTransform);
    } else {
      animating = false;
    }
  }

  if (!isTouchDevice) {
    // Mouse events for desktop
    parallaxContainer.addEventListener(
      "mouseenter",
      function () {
        parallaxContainer.style.transition = "transform 0.4s ease-out";
        colorSpotlight.style.display = "block";
      },
      { passive: true }
    );

    // Use throttled mousemove with requestAnimationFrame
    let mouseMoveRafId = null;
    parallaxContainer.addEventListener(
      "mousemove",
      function (e) {
        if (mouseMoveRafId) return;

        mouseMoveRafId = requestAnimationFrame(() => {
          const rect = parallaxContainer.getBoundingClientRect();

          // Get mouse position relative to the container
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;

          // Update CSS variables for gradient positioning - batched with other changes
          root.style.setProperty("--mouse-x", `${mouseX}px`);
          root.style.setProperty("--mouse-y", `${mouseY}px`);

          // Update color spotlight position
          colorSpotlight.style.clipPath = `circle(200px at ${mouseX}px ${mouseY}px)`;
          colorSpotlight.style.webkitClipPath = `circle(200px at ${mouseX}px ${mouseY}px)`;

          // Calculate center and deltas for tilt effect
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const deltaX = mouseX - centerX;
          const deltaY = mouseY - centerY;

          // Set target angles
          targetRotateX = (-deltaY / rect.height) * 30;
          targetRotateY = (deltaX / rect.width) * 30;
          targetRotateZ = (deltaX / rect.width) * 10;

          // Start animation if not already running
          if (!animating) {
            animating = true;
            requestAnimationFrame(updateTransform);
          }

          // After initial movement, remove transition for responsive feel
          setTimeout(() => {
            parallaxContainer.style.transition = "";
          }, 100);

          mouseMoveRafId = null;
        });
      },
      { passive: true }
    );

    // Add transition for smooth reset when mouse leaves
    parallaxContainer.addEventListener(
      "mouseleave",
      function () {
        colorSpotlight.style.display = "none";

        parallaxContainer.style.transition = "transform 0.8s ease";

        // Reset targets
        targetRotateX = 0;
        targetRotateY = 0;
        targetRotateZ = 0;

        // Start animation if not already running
        if (!animating) {
          animating = true;
          requestAnimationFrame(updateTransform);
        }
      },
      { passive: true }
    );
  } else {
    // Touch device handling - optimized with similar patterns
    parallaxContainer.addEventListener(
      "touchstart",
      function (e) {
        colorSpotlight.style.display = "block";

        const touch = e.touches[0];
        const rect = parallaxContainer.getBoundingClientRect();

        handleTouch(touch, rect);

        // Apply initial transform
        parallaxContainer.style.transition = "transform 0.5s ease";
      },
      { passive: true }
    );

    // Optimize touchmove with throttling
    let touchMoveRafId = null;
    parallaxContainer.addEventListener(
      "touchmove",
      function (e) {
        if (touchMoveRafId) return;

        touchMoveRafId = requestAnimationFrame(() => {
          const touch = e.touches[0];
          const rect = parallaxContainer.getBoundingClientRect();

          handleTouch(touch, rect);
          touchMoveRafId = null;
        });
      },
      { passive: true }
    );

    function handleTouch(touch, rect) {
      const touchX = touch.clientX - rect.left;
      const touchY = touch.clientY - rect.top;

      // Update CSS variables for gradient
      root.style.setProperty("--mouse-x", `${touchX}px`);
      root.style.setProperty("--mouse-y", `${touchY}px`);

      // Update clip path
      colorSpotlight.style.clipPath = `circle(200px at ${touchX}px ${touchY}px)`;
      colorSpotlight.style.webkitClipPath = `circle(200px at ${touchX}px ${touchY}px)`;

      // Calculate tilt
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const deltaX = touchX - centerX;
      const deltaY = touchY - centerY;

      targetRotateX = (-deltaY / rect.height) * 10;
      targetRotateY = (deltaX / rect.width) * 10;
      targetRotateZ = 0;

      // Start animation if needed
      if (!animating) {
        animating = true;
        requestAnimationFrame(updateTransform);
      }
    }

    parallaxContainer.addEventListener(
      "touchend",
      function () {
        colorSpotlight.style.display = "none";

        parallaxContainer.style.transition = "transform 0.8s ease";

        // Reset targets
        targetRotateX = 0;
        targetRotateY = 0;
        targetRotateZ = 0;

        if (!animating) {
          animating = true;
          requestAnimationFrame(updateTransform);
        }
      },
      { passive: true }
    );
  }
}

// Optimize mobile menu setup
function setupMobileMenu(mobileMenuToggle, mobileNav, mobileNavOverlay, mobileNavLinks) {
  if (!mobileMenuToggle || !mobileNav || !mobileNavOverlay) return;

  function closeMenu() {
    mobileMenuToggle.classList.remove("active");
    mobileNav.classList.remove("active");
    mobileNavOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  // Toggle menu event
  mobileMenuToggle.addEventListener("click", function () {
    const isOpening = !mobileNav.classList.contains("active");

    mobileMenuToggle.classList.toggle("active");
    mobileNav.classList.toggle("active");
    mobileNavOverlay.classList.toggle("active");

    // Set overflow only when needed
    document.body.style.overflow = isOpening ? "hidden" : "";
  });

  // Close menu event
  mobileNavOverlay.addEventListener("click", closeMenu);

  // Close menu on link click - use event delegation
  if (mobileNavLinks.length > 0) {
    mobileNavLinks[0].parentNode.addEventListener("click", function (e) {
      if (e.target.tagName.toLowerCase() === "a") {
        closeMenu();
      }
    });
  }
}

// Optimize viewport adjustments
function adjustViewportForMobile(particlesContainer) {
  if (!particlesContainer) return;

  // Check if user is on a mobile device once
  if (window.innerWidth <= 768) {
    // Reduce particle count for better performance
    const particles = particlesContainer.querySelectorAll(".particle");
    if (particles.length > 10) {
      // Remove excess particles
      for (let i = 10; i < particles.length; i++) {
        particles[i].remove();
      }
    }
  }
}
