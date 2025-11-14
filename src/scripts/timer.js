import fetchTemplate from "./util/fetch-template.js";

const newTimers = [];
const unitializedTimers = [];
const timers = [];

function handleTimeSelection(target, delta=0) {
    if (delta) {
        target.selectionStart = Math.min(
            Math.max(target.selectionStart + (3 * delta), 0),
            target.value.length - 2
        );
        target.selectionEnd = target.selectionStart + 2;
        return;
    }
    if (target.selectionStart > target.value.length - 3) {
        target.selectionStart = target.value.length - 2;
        target.selectionEnd = target.selectionStart + 2;
    } else if (target.selectionStart <= target.value.length - 3 && target.selectionEnd > target.value.length - 6) {
        target.selectionStart = target.value.length - 5;
        target.selectionEnd = target.selectionStart + 2;
    } else {
        target.selectionStart = 0;
        target.selectionEnd = target.value.length - 6;
    }
}

function insertTimeString(component, rawTimeString) {
    component.value = rawTimeString.slice(0, 2) + ':'
      + rawTimeString.slice(2, 4) + ':'
      + rawTimeString.slice(4)
}

function normalizeTime(timer) {
    const stringChunks = []
    const display = timer.component.querySelector(".timer-display");
    stringChunks.push(timer.rawString.substring(0, 2));
    stringChunks.push(timer.rawString.substring(2, 4));
    stringChunks.push(timer.rawString.substring(4));
    timer.time = (parseInt(stringChunks[0]) * 3600)
        + (parseInt(stringChunks[1]) * 60)
        + parseInt(stringChunks[2]);
    stringChunks[0] = Math.trunc(timer.time / 3600).toString().substring(-2).padStart(2, '0');
    stringChunks[1] = Math.trunc((timer.time % 3600) / 60).toString().substring(-2).padStart(2, '0');
    stringChunks[2] = (timer.time % 60).toString().substring(-2).padStart(2, '0');
    timer.rawString = stringChunks.join('');
    insertTimeString(display, timer.rawString)
}

function handleTimeTyping(timer, target, digit) {
    const selectionStart = target.selectionStart;
    const cursor = target.selectionEnd - Math.trunc(target.selectionStart / 3);
    let raw = `${timer.rawString.slice(0, cursor)}${digit}${timer.rawString.slice(cursor)}`
    raw = raw.slice(-6);
    target.value = `${raw.slice(0, 2)}:${raw.slice(2, 4)}:${raw.slice(4)}`;
    timer.rawString = raw;
    target.selectionStart = selectionStart;
    target.selectionEnd = selectionStart + 2;
}

function handleTimerMouseUp(event, timer) {
    if (timer.active) return;
    event.preventDefault();
    event.stopPropagation();
    handleTimeSelection(event.target, 0)
}

function handleTimerKeyDown(event, timer) {
    if (timer.active) return;
    event.preventDefault();
    event.stopPropagation();
    const delta = event.code === "ArrowLeft" ? -1 : event.code === "ArrowRight" ? 1 : 0;
    if (delta) {
        handleTimeSelection(event.target, delta);
        return;
    }
    if (isFinite(event.key) && event.key !== '') {
        handleTimeTyping(timer, event.target, event.key);
    }
}

function handleTimerBlur(timer) {
    if (timer.active) return;
    normalizeTime(timer);
}

async function createTimers() {
    const template = await fetchTemplate('src/templates/timer.html', '.timer-container');
    while (newTimers.length) {
        const timer = newTimers.pop();
        const newTimer = template.cloneNode(true);
        timer.component.appendChild(newTimer);
        unitializedTimers.push(timer);
    }
    requestAnimationFrame(addListeners);
}

function startTimer(timer) {
    timer.active = true;
    timer.lastUpdate = Date.now();
    timer.component.querySelector('.timer-display').disabled = true;
}

function stopTimer(timer) {
    timer.active = false;
    timer.component.querySelector('.timer-display').disabled = false;
}

function resetTimer(timer) {
    timer.currentTime = 0;
    handleCountdown(timer);
}

function addListeners() {
    while (unitializedTimers.length) {
        const timer = unitializedTimers.pop();
        const timerDisplay = timer.component.querySelector('.timer-display');
        timerDisplay.addEventListener('mouseup', (event) => handleTimerMouseUp(event, timer));
        timerDisplay.addEventListener('keydown', (event) => handleTimerKeyDown(event, timer));
        timerDisplay.addEventListener('blur', () => handleTimerBlur(timer));
        timer.component.querySelector('.timer-start').addEventListener(
            'click',
            () => startTimer(timer)
        );
        timer.component.querySelector('.timer-stop').addEventListener(
            'click',
            () => stopTimer(timer)
        );
        timer.component.querySelector('.timer-reset').addEventListener(
            'click',
            () => resetTimer(timer)
        );
        timers.push(timer);
    }
}

function addTimer(containerSelector) {
    const newTimer = document.createElement("div");
    newTimer.classList.add('timer');
    document.querySelector(containerSelector).appendChild(newTimer);
    newTimers.push({
        component: newTimer,
        rawString: '000000',
        time: 0,
        currentTime: 0,
        lastUpdate: 0,
        active: false
    });
    requestAnimationFrame(createTimers);
}

function handleCountdown(timer) {
    const timeDelta = timer.time - timer.currentTime;
    let raw = Math.trunc(timeDelta / 3600).toString().padStart(2, '0')
      + Math.trunc((timeDelta % 3600) / 60).toString().padStart(2, '0')
      + Math.trunc(timeDelta % 60).toString().padStart(2, '0');
    timer.currentTime += (Date.now() - timer.lastUpdate) / 1000;
    timer.lastUpdate = Date.now();
    timer.rawString = raw.slice(-6);
    insertTimeString(timer.component.querySelector('.timer-display'), timer.rawString);

}

function handleTimers() {
    for (const timer of timers.filter(timer => timer.active)) {
        handleCountdown(timer);
        if ((timer.time - timer.currentTime) <= 0) {
            timer.currentTime = timer.time;
            stopTimer(timer);
        }
    }
    requestAnimationFrame(handleTimers)
}

handleTimers()
document.querySelector('#add-timer')
    .addEventListener('click', () => addTimer('.timers-container'));