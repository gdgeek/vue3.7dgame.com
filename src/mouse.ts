import { DirectiveBinding } from "vue";

interface Heart {
  el: HTMLElement;
  x: number;
  y: number;
  scale: number;
  alpha: number;
  color: string;
}

// 鼠标点击爱心
export const mouseEffect = {
  mounted(el: HTMLElement) {
    const hearts: Heart[] = [];

    const createHeart = (event: MouseEvent) => {
      const heart = document.createElement("div");
      heart.className = "heart";
      hearts.push({
        el: heart,
        x: event.clientX - 5,
        y: event.clientY - 5,
        scale: 1,
        alpha: 1,
        color: randomColor(),
      });
      document.body.appendChild(heart);
    };

    const randomColor = (): string => {
      return `rgb(${~~(255 * Math.random())},${~~(255 * Math.random())},${~~(255 * Math.random())})`;
    };

    const animateHearts = () => {
      for (let i = 0; i < hearts.length; i++) {
        const heart = hearts[i];
        if (heart.alpha <= 0) {
          document.body.removeChild(heart.el);
          hearts.splice(i, 1);
          i--;
        } else {
          heart.y--;
          heart.scale += 0.004;
          heart.alpha -= 0.013;
          heart.el.style.cssText =
            `left:${heart.x}px;top:${heart.y}px;opacity:${heart.alpha};` +
            `transform:scale(${heart.scale},${heart.scale}) rotate(45deg);` +
            `background:${heart.color};z-index:99999`;
        }
      }
      requestAnimationFrame(animateHearts);
    };

    const addStyles = () => {
      const style = document.createElement("style");
      style.type = "text/css";
      style.textContent = `
        .heart {
          width: 10px;
          height: 10px;
          position: fixed;
          background: #f00;
          transform: rotate(45deg);
          -webkit-transform: rotate(45deg);
          -moz-transform: rotate(45deg);
        }
        .heart:after,
        .heart:before {
          content: '';
          width: inherit;
          height: inherit;
          background: inherit;
          border-radius: 50%;
          -webkit-border-radius: 50%;
          -moz-border-radius: 50%;
          position: fixed;
        }
        .heart:after {
          top: -5px;
        }
        .heart:before {
          left: -5px;
        }
      `;
      document.head.appendChild(style);
    };

    addStyles();
    el.addEventListener("click", createHeart);
    animateHearts();
  },
  unmounted(el: HTMLElement) {
    el.removeEventListener("click", () => {});
  },
};

// 粒子效果
export const particleEffect = {
  mounted(el: HTMLElement) {
    const particles: HTMLElement[] = [];

    const createParticle = (event: MouseEvent) => {
      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${event.clientX}px`;
      particle.style.top = `${event.clientY}px`;
      particle.style.background = randomColor();
      particles.push(particle);
      document.body.appendChild(particle);
      animateParticle(particle);
    };

    const randomColor = (): string => {
      return `rgb(${~~(255 * Math.random())},${~~(255 * Math.random())},${~~(255 * Math.random())})`;
    };

    const animateParticle = (particle: HTMLElement) => {
      let life = 1; // 生存周期
      const animation = () => {
        life -= 0.01;
        if (life <= 0) {
          document.body.removeChild(particle);
          particles.splice(particles.indexOf(particle), 1);
        } else {
          particle.style.opacity = `${life}`;
          particle.style.transform = `translateY(-${life * 20}px) scale(${life})`;
          requestAnimationFrame(animation);
        }
      };
      requestAnimationFrame(animation);
    };

    const addStyles = () => {
      const style = document.createElement("style");
      style.type = "text/css";
      style.textContent = `
        .particle {
          position: fixed;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
          z-index: 99999;
          transform: translateY(0) scale(1);
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        }
      `;
      document.head.appendChild(style);
    };

    addStyles();
    el.addEventListener("mousemove", createParticle);
  },
  unmounted(el: HTMLElement) {
    el.removeEventListener("mousemove", () => {});
  },
};
