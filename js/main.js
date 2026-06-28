/**
 * 摄影作品集首页 — 主脚本
 * 纯 Vanilla JS，零依赖
 */

(function () {
  'use strict';

  // ==================== 深色模式 ====================
  const Theme = {
    STORAGE_KEY: 'portfolio-theme',
    DARK_CLASS: 'dark',

    init() {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.apply(saved);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.apply(prefersDark ? 'dark' : 'light');
      }

      // 监听系统偏好变化
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(this.STORAGE_KEY)) {
          this.apply(e.matches ? 'dark' : 'light');
        }
      });
    },

    toggle() {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      this.apply(next);
      localStorage.setItem(this.STORAGE_KEY, next);
    },

    apply(mode) {
      if (mode === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.add(this.DARK_CLASS);
      } else {
        document.documentElement.removeAttribute('data-theme');
        document.documentElement.classList.remove(this.DARK_CLASS);
      }
    }
  };

  // ==================== 轮播 ====================
  const Carousel = {
    track: null,
    slides: [],
    dots: [],
    indicatorsContainer: null,
    wrapper: null,
    arrowLeft: null,
    arrowRight: null,
    currentIndex: 0,
    autoPlayTimer: null,
    INTERVAL: 6000,
    isPaused: false,
    isMobile: false,
    startX: 0,
    currentTranslate: 0,
    dragged: false,

    init() {
      this.track = document.querySelector('.carousel__track');
      this.slides = Array.from(document.querySelectorAll('.carousel__slide'));
      this.indicatorsContainer = document.querySelector('.carousel__indicators');
      this.wrapper = document.querySelector('.carousel-wrapper');
      this.arrowLeft = document.querySelector('.carousel__arrow--left');
      this.arrowRight = document.querySelector('.carousel__arrow--right');
      this.isMobile = window.innerWidth <= 767;

      if (!this.track || this.slides.length === 0) return;

      // 创建指示点
      this.createDots();

      // 克隆首尾 slide 实现无缝循环
      this.setupInfiniteClone();

      this.currentIndex = 1; // 从第一个真实 slide 开始
      this.goToSlide(this.currentIndex, false);

      if (!this.isMobile) {
        this.startAutoPlay();
        this.bindHoverEvents();
        this.bindTouchEvents();
      } else {
        // Mobile: 所有图片可见，标记第一个为 active
        this.setMobileActive();
        this.bindMobileTouch();
      }

      // 箭头按钮动态定位
      if (!this.isMobile) {
        this.positionArrows();
      }

      // 响应式切换监听
      window.addEventListener('resize', () => {
        this.handleResize();
        if (!this.isMobile) this.positionArrows();
      });
    },

    positionArrows() {
      if (!this.arrowLeft || !this.arrowRight || !this.wrapper) return;
      const img = this.wrapper.querySelector('.carousel__slide img');
      if (!img) return;
      const imgWidth = img.getBoundingClientRect().width;
      const wrapperWidth = this.wrapper.getBoundingClientRect().width;
      // 图片在 wrapper 中居中，计算左右边缘
      const imgLeft = (wrapperWidth - imgWidth) / 2;
      const arrowOffset = 35;
      this.arrowLeft.style.left = (imgLeft - 48 - arrowOffset) + 'px';
      this.arrowRight.style.right = (imgLeft - 48 - arrowOffset) + 'px';
    },

    createDots() {
      if (!this.indicatorsContainer) return;
      const realCount = this.slides.length;
      for (let i = 0; i < realCount; i++) {
        const dot = document.createElement('button');
        dot.classList.add('carousel__dot');
        dot.setAttribute('aria-label', 'Slide ' + (i + 1));
        dot.addEventListener('click', () => this.goToSlide(i + 1, true));
        this.indicatorsContainer.appendChild(dot);
        this.dots.push(dot);
      }
    },

    setupInfiniteClone() {
      const firstClone = this.slides[0].cloneNode(true);
      const lastClone = this.slides[this.slides.length - 1].cloneNode(true);

      // 给克隆元素添加标记类（可选）
      firstClone.classList.add('carousel__slide--clone');
      lastClone.classList.add('carousel__slide--clone');

      this.track.appendChild(firstClone);
      this.track.insertBefore(lastClone, this.slides[0]);

      // 更新 slides 列表（包含克隆）
      this.slides = Array.from(this.track.querySelectorAll('.carousel__slide'));
    },

    goToSlide(index, animate) {
      this.currentIndex = index;
      const slideWidth = this.slides[0].getBoundingClientRect().width;

      // 如果因间隙等原因需要 gap，Desktop 下 track 偏移计算
      this.currentTranslate = -index * slideWidth;

      if (animate) {
        this.track.style.transition = 'transform 0.5s ease';
      } else {
        this.track.style.transition = 'none';
      }
      this.track.style.transform = 'translateX(' + this.currentTranslate + 'px)';

      // 更新 active 类
      this.updateActiveSlide(index, animate);

      // 更新指示器
      this.updateDots(index);

      // 无缝循环：过渡结束后跳转到真实 slide
      const realCount = this.slides.length - 2;
      if (index === 0) {
        // 在最后一个克隆上，跳转到最后一个真实 slide
        setTimeout(() => {
          this.track.style.transition = 'none';
          this.currentIndex = realCount;
          const offset = -this.currentIndex * slideWidth;
          this.currentTranslate = offset;
          this.track.style.transform = 'translateX(' + offset + 'px)';
          this.updateActiveSlide(this.currentIndex, false);
          this.updateDots(this.currentIndex);
        }, 500);
      } else if (index === this.slides.length - 1) {
        // 在第一个克隆上，跳转到第一个真实 slide
        setTimeout(() => {
          this.track.style.transition = 'none';
          this.currentIndex = 1;
          const offset = -this.currentIndex * slideWidth;
          this.currentTranslate = offset;
          this.track.style.transform = 'translateX(' + offset + 'px)';
          this.updateActiveSlide(this.currentIndex, false);
          this.updateDots(this.currentIndex);
        }, 500);
      }
    },

    updateActiveSlide(activeIndex, animate) {
      this.slides.forEach((slide, i) => {
        if (i === activeIndex) {
          if (animate) {
            // 先移除后添加以重新触发 transition
            slide.classList.remove('is-active');
            void slide.offsetWidth;
          }
          slide.classList.add('is-active');
        } else {
          slide.classList.remove('is-active');
        }
      });
    },

    updateDots(activeIndex) {
      const realCount = this.slides.length - 2;
      this.dots.forEach((dot, i) => {
        const targetRealIndex = activeIndex === 0 ? realCount - 1
          : activeIndex === this.slides.length - 1 ? 0
          : activeIndex - 1;
        if (i === targetRealIndex) {
          dot.classList.add('is-active');
        } else {
          dot.classList.remove('is-active');
        }
      });
    },

    next() {
      this.goToSlide(this.currentIndex + 1, true);
    },

    prev() {
      this.goToSlide(this.currentIndex - 1, true);
    },

    startAutoPlay() {
      this.stopAutoPlay();
      this.autoPlayTimer = setInterval(() => {
        if (!this.isPaused) {
          this.next();
        }
      }, this.INTERVAL);
    },

    stopAutoPlay() {
      if (this.autoPlayTimer) {
        clearInterval(this.autoPlayTimer);
        this.autoPlayTimer = null;
      }
    },

    bindHoverEvents() {
      if (!this.track) return;
      this.track.addEventListener('mouseenter', () => {
        this.isPaused = true;
      });
      this.track.addEventListener('mouseleave', () => {
        this.isPaused = false;
      });
    },

    bindTouchEvents() {
      if (!this.track) return;
      let startX = 0;
      let startTranslate = 0;
      let isDragging = false;

      this.track.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startTranslate = this.currentTranslate;
        isDragging = true;
        this.isPaused = true;
        this.track.style.transition = 'none';
      }, { passive: true });

      this.track.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const diff = e.touches[0].clientX - startX;
        this.track.style.transform = 'translateX(' + (startTranslate + diff) + 'px)';
      }, { passive: true });

      this.track.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diff = e.changedTouches[0].clientX - startX;
        const threshold = 60;

        if (diff < -threshold) {
          this.next();
        } else if (diff > threshold) {
          this.prev();
        } else {
          this.goToSlide(this.currentIndex, true);
        }

        setTimeout(() => {
          this.isPaused = false;
        }, 500);
      });
    },

    // Mobile 专用
    setMobileActive() {
      if (this.slides.length > 0) {
        this.slides.forEach((s) => s.classList.remove('is-active'));
        this.slides[0].classList.add('is-active');
      }
    },

    bindMobileTouch() {
      const container = document.querySelector('.carousel');
      if (!container) return;
      let touchStartY = 0;

      container.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      container.addEventListener('touchmove', (e) => {
        // 允许垂直滚动，不阻止默认行为
      }, { passive: true });
    },

    handleResize() {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth <= 767;

      if (wasMobile !== this.isMobile) {
        // 重置轮播状态
        this.stopAutoPlay();
        this.currentIndex = 1;

        // 清空 track 中的克隆元素
        const clones = this.track.querySelectorAll('.carousel__slide--clone');
        clones.forEach((c) => c.remove());
        this.slides = Array.from(this.track.querySelectorAll('.carousel__slide'));

        if (!this.isMobile) {
          this.setupInfiniteClone();
          this.goToSlide(1, false);
          this.startAutoPlay();
          this.bindHoverEvents();
          this.bindTouchEvents();
        } else {
          this.track.style.transform = 'none';
          this.track.style.transition = 'none';
          this.setMobileActive();
          this.bindMobileTouch();
        }
      }
    }
  };

  // ==================== 滚动动画（IntersectionObserver） ====================
  const ScrollReveal = {
    init() {
      const sections = document.querySelectorAll('.section--reveal');
      if (sections.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 }
      );

      sections.forEach((section) => observer.observe(section));
    }
  };

  // ==================== 导航按钮事件绑定 ====================
  const Nav = {
    init() {
      // 主题切换按钮
      const themeToggle = document.querySelector('.nav__theme-toggle');
      if (themeToggle) {
        themeToggle.addEventListener('click', () => Theme.toggle());
      }

      // Gallery 按钮
      const galleryBtn = document.querySelector('.nav__gallery-btn');
      if (galleryBtn) {
        galleryBtn.addEventListener('click', () => {
          window.location.href = 'yingjizhuye.html';
        });
      }

      // 轮播箭头按钮
      const arrowLeft = document.querySelector('.carousel__arrow--left');
      const arrowRight = document.querySelector('.carousel__arrow--right');
      if (arrowLeft) {
        arrowLeft.addEventListener('click', () => Carousel.prev());
      }
      if (arrowRight) {
        arrowRight.addEventListener('click', () => Carousel.next());
      }
    }
  };

  // ==================== 初始化 ====================
  function init() {
    Theme.init();
    Nav.init();
    Carousel.init();
    ScrollReveal.init();
  }

  // DOM 就绪后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();