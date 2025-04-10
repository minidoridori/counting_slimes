const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const answerText = document.getElementById("answer");
const timerText = document.getElementById("timer");
const difficultySelect = document.getElementById("difficulty");
const durationSelect = document.getElementById("duration");
const bgm = document.getElementById("bgm");
const logContent = document.getElementById("logContent");
const logHeader = document.getElementById("logHeader");

const boxImage = new Image();
boxImage.src = "resource/box.png";
const circleInImage = new Image();
circleInImage.src = "resource/circle_in.png";
const circleOutImage = new Image();
circleOutImage.src = "resource/circle_out.png";
const backgroundImage = new Image();
backgroundImage.src = "resource/background.jpg";

const box = { x: 400, y: 200, width: 200, height: 200 };
const circles = [];
let insideCount = 0;
let animationId;

let imagesLoaded = 0;
const totalImages = 4;
function checkImagesLoaded() {
  imagesLoaded++;
}
boxImage.onload = checkImagesLoaded;
circleInImage.onload = checkImagesLoaded;
circleOutImage.onload = checkImagesLoaded;
backgroundImage.onload = checkImagesLoaded;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnCircle(goIn) {
  let x, y, targetX, targetY;

  if (goIn) {
    x = Math.random() < 0.5 ? -40 : canvas.width + 40;
    y = randomBetween(100, 500);
    targetX = randomBetween(box.x + 30, box.x + box.width - 30);
    targetY = randomBetween(box.y + 30, box.y + box.height - 30);
  } else {
    x = randomBetween(box.x + 30, box.x + box.width - 30);
    y = randomBetween(box.y + 30, box.y + box.height - 30);
    targetX = x < canvas.width / 2 ? -60 : canvas.width + 60;
    targetY = randomBetween(50, 550);
  }

  circles.push({ x, y, targetX, targetY, progress: 0, goIn, wasInside: !goIn });
}

function isInsideBox(x, y, box) {
  return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
}

function isInsideFadeArea(x, y, box, margin = 30) {
  return (
    x >= box.x + margin &&
    x <= box.x + box.width - margin &&
    y >= box.y + margin &&
    y <= box.y + box.height - margin
  );
}

function logMessage(message, type = "default") {
  const p = document.createElement("p");
  const time = new Date().toLocaleTimeString();
  p.innerHTML = `<span>[${time}]</span> ${message}`;
  if (type === "in") p.classList.add("log-in");
  if (type === "out") p.classList.add("log-out");
  logContent.appendChild(p);
  logContent.scrollTop = logContent.scrollHeight;
}

// 📋 로그 토글
function toggleLogBox() {
  const isVisible = logContent.style.display !== "none";
  if (isVisible) {
    logContent.style.display = "none";
    logHeader.textContent = "동작 로그 〓";
  } else {
    logContent.style.display = "block";
    logHeader.textContent = "동작 로그 ▼";
  }
}

function updateCircles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (backgroundImage.complete) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(boxImage, box.x, box.y, box.width, box.height);

  const stillMoving = [];

  for (let c of circles) {
    c.progress += 0.02;
    c.x += (c.targetX - c.x) * 0.05;
    c.y += (c.targetY - c.y) * 0.05;

    const isInside = isInsideBox(c.x, c.y, box);
    const isInFadeArea = isInsideFadeArea(c.x, c.y, box, 30);

    if (c.goIn && isInside && !c.wasInside) {
      insideCount++;
      c.wasInside = true;
      logMessage(`🔵 슬라임이 들어감 (${insideCount} 마리)`, "in");
    } else if (!c.goIn && !isInside && c.wasInside) {
      insideCount = Math.max(0, insideCount - 1);
      c.wasInside = false;
      logMessage(`⚪ 슬라임이 나감 (${insideCount} 마리)`, "out");
    }

    if (Math.sqrt((c.targetX - c.x) ** 2 + (c.targetY - c.y) ** 2) > 5) {
      stillMoving.push(c);
    }

    let alpha = 1;
    if (isInFadeArea) {
      if (c.goIn) alpha = Math.max(0, 1 - (c.progress - 0.3) * 1.5);
      else alpha = Math.min(1, c.progress * 2.5);
    }

    const image = c.goIn ? circleInImage : circleOutImage;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(image, c.x - 25, c.y - 25, 50, 50);
    ctx.restore();
  }

  circles.length = 0;
  circles.push(...stillMoving);

  animationId = requestAnimationFrame(updateCircles);
}

// 🎵 배경음 페이드
function fadeInBGM(duration = 2000) {
  bgm.volume = 0;
  const step = 0.02;
  const interval = setInterval(() => {
    bgm.volume = Math.min(1, bgm.volume + step);
    if (bgm.volume >= 1) clearInterval(interval);
  }, duration * step);
}

function fadeOutBGM(duration = 2000) {
  const step = 0.02;
  const interval = setInterval(() => {
    bgm.volume = Math.max(0, bgm.volume - step);
    if (bgm.volume <= 0) {
      bgm.pause();
      bgm.currentTime = 0;
      clearInterval(interval);
    }
  }, duration * step);
}

function startGame() {
  if (imagesLoaded < totalImages) {
    alert("이미지가 아직 로드되지 않았습니다. 잠시 후 다시 시도하세요.");
    return;
  }

  cancelAnimationFrame(animationId);
  circles.length = 0;
  insideCount = 0;
  answerText.textContent = "";
  overlay.style.zIndex = "-1";
  logContent.innerHTML = "";

  bgm.volume = 0;
  bgm.currentTime = 0;
  bgm.play();
  fadeInBGM();

  const gameDuration = parseInt(durationSelect.value);
  const difficulty = difficultySelect.value;

  let spawnIntervalTime;
  switch (difficulty) {
    case "easy": spawnIntervalTime = 1000; break;
    case "medium": spawnIntervalTime = 500; break;
    case "hard": spawnIntervalTime = 300; break;
    case "veryhard": spawnIntervalTime = 100; break;
  }

  const startTime = Date.now();

  const timerInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, gameDuration - elapsed);
    const secondsLeft = (remainingTime / 1000).toFixed(1);
    timerText.textContent = `남은 시간: ${secondsLeft}초`;

    if (remainingTime <= 0) {
      clearInterval(timerInterval);
      timerText.textContent = "시간 종료!";
      fadeOutBGM();
    }
  }, 100);

  const spawnInterval = setInterval(() => {
    if (Date.now() - startTime > gameDuration) {
      clearInterval(spawnInterval);
    } else {
      const shouldGoIn = Math.random() > 0.5;
      const canGoOut = insideCount > 0 && Math.random() > 0.3;
      if (shouldGoIn) spawnCircle(true);
      else if (canGoOut) spawnCircle(false);
    }
  }, spawnIntervalTime);

  updateCircles();
}

function showAnswer() {
  overlay.style.zIndex = "-1";
  answerText.textContent = `정답: ${insideCount}마리의 슬라임이 남아있습니다!`;
}

// 드래그 가능하도록 설정
let isDragging = false;
let offsetX, offsetY;

const logBox = document.getElementById("logBox");

logBox.addEventListener("mousedown", (e) => {
  isDragging = true;
  const rect = logBox.getBoundingClientRect();
  offsetX = e.clientX - rect.left;
  offsetY = e.clientY - rect.top;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  logBox.style.left = `${e.clientX - offsetX}px`;
  logBox.style.top = `${e.clientY - offsetY}px`;
  logBox.style.right = "auto"; // 기존 right 고정 제거
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});
