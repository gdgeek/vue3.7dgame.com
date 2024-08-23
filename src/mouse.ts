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

export const particleEffect = {
  mounted(el: HTMLElement) {
    const particles: HTMLElement[] = [];
    const colors = [
      "#00bdff",
      "#4d39ce",
      "#088eff",
      "#ff0044",
      "#ff8c00",
      "#32cd32",
      "#00fa9a",
      "#ff1493",
      "#1e90ff",
      "#ff4500",
    ];

    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseMoving = false;

    // 创建粒子
    const createParticle = (event: MouseEvent) => {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      mouseMoving = true;

      const particle = document.createElement("div");
      particle.className = "particle";
      particle.style.left = `${lastMouseX}px`;
      particle.style.top = `${lastMouseY}px`;
      particle.style.background = randomColor();
      particle.dataset.life = "1"; // 用于控制粒子的生存周期
      particle.dataset.radius = `${Math.random() * 20 + 10}`; // 粒子的运动半径
      particle.dataset.speed = `${Math.random() * 0.03 + 0.01}`; // 减慢旋转速度
      particle.dataset.angle = `${Math.random() * Math.PI * 2}`; // 粒子的初始角度
      particle.dataset.startX = `${lastMouseX}`;
      particle.dataset.startY = `${lastMouseY}`;
      particles.push(particle);
      document.body.appendChild(particle);
      animateParticle(particle);
    };

    // 随机生成颜色
    const randomColor = (): string => {
      return colors[Math.floor(Math.random() * colors.length)];
    };

    // 线性插值
    const lerp = (start: number, end: number, t: number): number => {
      return start + (end - start) * t;
    };

    // 动画粒子
    const animateParticle = (particle: HTMLElement) => {
      const radius = parseFloat(particle.dataset.radius || "10");
      const speed = parseFloat(particle.dataset.speed || "0.01"); // 固定旋转速度
      let angle = parseFloat(particle.dataset.angle || "0");
      const startX = parseFloat(particle.dataset.startX || "0");
      const startY = parseFloat(particle.dataset.startY || "0");
      let life = parseFloat(particle.dataset.life || "1");

      const animation = () => {
        if (life <= 0) {
          document.body.removeChild(particle);
          particles.splice(particles.indexOf(particle), 1);
        } else {
          if (mouseMoving) {
            // 鼠标移动时，粒子跟随鼠标移动并逐渐消失
            life -= 0.01;
            angle += speed;
            const targetX = startX + Math.cos(angle) * radius;
            const targetY = startY + Math.sin(angle) * radius;

            const currentX = parseFloat(particle.style.left || "0");
            const currentY = parseFloat(particle.style.top || "0");

            particle.style.left = `${lerp(currentX, targetX, 0.05)}px`;
            particle.style.top = `${lerp(currentY, targetY, 0.05)}px`;
            particle.style.opacity = `${life}`;
            particle.style.transform = `scale(${life})`;
            requestAnimationFrame(animation);
          } else {
            // 鼠标停止移动时，粒子扩散并旋转
            angle += speed; // 使用固定旋转速度
            const spreadRadius =
              parseFloat(particle.dataset.radius || "20") * 2; // 粒子扩散半径
            const targetX = lastMouseX + Math.cos(angle) * spreadRadius;
            const targetY = lastMouseY + Math.sin(angle) * spreadRadius;

            const currentX = parseFloat(particle.style.left || "0");
            const currentY = parseFloat(particle.style.top || "0");

            particle.style.left = `${lerp(currentX, targetX, 0.05)}px`;
            particle.style.top = `${lerp(currentY, targetY, 0.05)}px`;
            particle.style.opacity = "1";
            particle.style.transform = `scale(1)`;
            requestAnimationFrame(animation);
          }
        }
      };
      requestAnimationFrame(animation);
    };

    // 添加粒子样式
    const addStyles = () => {
      const style = document.createElement("style");
      style.type = "text/css";
      style.textContent = `
        .particle {
          position: fixed;
          width: 2.5px; /* 粒子大小 */
          height: 2.5px; /* 粒子大小 */
          border-radius: 50%;
          pointer-events: none;
          will-change: transform, opacity;
          z-index: 99999;
          transform: scale(1);
          transition: opacity 0.2s ease-out, transform 0.2s ease-out;
        }
      `;
      document.head.appendChild(style);
    };

    addStyles();
    el.addEventListener("mousemove", createParticle);

    // 鼠标移动时创建粒子
    let mouseMoveTimeout: number | undefined;
    const onMouseMove = (event: MouseEvent) => {
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      mouseMoving = true;

      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = window.setTimeout(() => {
        mouseMoving = false;
      }, 100); // 设置延迟来检测鼠标是否停止
    };

    el.addEventListener("mousemove", onMouseMove);
  },
  unmounted(el: HTMLElement) {
    el.removeEventListener("mousemove", () => {});
  },
};
