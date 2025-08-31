$(document).ready(() => {

  // $(".index").on("click", () => {
  //     $(".index-item").toggleClass('is-hidden');
  //   });
  //   $(".nav-svg1").on("click", () => {
  //     $(".index-item").toggleClass('is-hidden');
  //   });

    $(".index").on("click", event => {
      $(".list-projects").toggleClass('is-hidden1');
    });

    $(".section-about-us").on("click", event => {
      $(".description-text").toggleClass('is-hidden');
    });

    $('.list-projects').on('click', '.list-projects1', function () {
      $(this).next('.index-item').toggleClass('is-hidden');   
      $(this).find('.nav-svg1').toggleClass('rotated');   
    });


   $('.nav-svg2').on('click',()=>{
      $('.search-filter').toggleClass('is-hidden');
   } )




  $(".list-item").on("click", function (e) {
      if ($(e.target).hasClass("nav-svg2")) return; 
      $(this).find(".nav-svg1").toggleClass("rotated");
    });

    $(function () {

      $(".list-projects1").on("click", function (event) {        
        $(event.currentTarget).find(".nav-svg1").toggleClass("rotated");

      });
    });
  
  })

// Mobile menu functionality
let isMenuTransitioning = false; // Prevent rapid toggling

function initializeMobileMenu() {
  console.log("Initializing mobile menu...");
  
  const trigger = document.getElementById('mobileTrigger');
  const overlay = document.getElementById('mobileOverlay');
  
  if (!trigger || !overlay) {
    console.error("Mobile menu elements not found:", { trigger: !!trigger, overlay: !!overlay });
    return;
  }
  
  console.log("Mobile menu elements found, setting up event listeners...");

  function toggleOverlay() {
    if (isMenuTransitioning) {
      console.log("Menu transition in progress, ignoring click");
      return;
    }
    
    console.log("Toggle overlay called");
    isMenuTransitioning = true;
    
    const willOpen = !overlay.classList.contains('open');
    overlay.classList.toggle('open', willOpen);
    trigger.setAttribute('aria-expanded', String(willOpen));
    overlay.setAttribute('aria-hidden', String(!willOpen));
    document.body.classList.toggle('menu-open', willOpen);
    console.log("Menu state:", willOpen ? 'opened' : 'closed');
    
    // Allow new interactions after transition completes
    setTimeout(() => {
      isMenuTransitioning = false;
    }, 300); // Slightly longer than CSS transition
  }

  // Add visual feedback for debugging
  trigger.style.border = '2px solid red';
  trigger.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
  
  // Remove any existing event listeners
  trigger.removeEventListener('click', handleTriggerClick);
  trigger.removeEventListener('touchstart', handleTriggerTouch);
  
  // Single handler for both click and touch
  function handleTriggerClick(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Hamburger clicked!");
    trigger.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Green feedback
    setTimeout(() => {
      trigger.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    }, 200);
    toggleOverlay();
  }
  
  function handleTriggerTouch(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Hamburger touched!");
    trigger.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'; // Green feedback
    setTimeout(() => {
      trigger.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    }, 200);
    toggleOverlay();
  }
  
  // Add event listeners
  trigger.addEventListener('click', handleTriggerClick);
  trigger.addEventListener('touchstart', handleTriggerTouch, { passive: false });

  // Optional: close on ESC
  document.removeEventListener('keydown', handleEscape);
  document.addEventListener('keydown', handleEscape);
  
  function handleEscape(e) {
    if (e.key === 'Escape' && overlay.classList.contains('open')) {
      toggleOverlay();
    }
  }

  // Optional: close when a link is clicked
  overlay.removeEventListener('click', handleOverlayClick);
  overlay.addEventListener('click', handleOverlayClick);
  
  function handleOverlayClick(e) {
    const link = e.target.closest('a');
    if (link) {
      console.log("Link clicked, closing menu");
      toggleOverlay();
    }
  }
  
  console.log("Mobile menu initialized successfully");
}

// Initialize mobile menu when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMobileMenu);
} else {
  initializeMobileMenu();
}

// Also initialize on window load to ensure everything is ready
window.addEventListener('load', () => {
  setTimeout(initializeMobileMenu, 100);
});
