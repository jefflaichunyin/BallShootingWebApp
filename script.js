const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const message = document.getElementById('message');
const success_tone = document.getElementById('success');
const start_tone = document.getElementById('start');
const fail_tone = document.getElementById('fail');

const ctx = canvas.getContext('2d');
const startButton = document.getElementById('startButton');

const shootButton = document.getElementById('shootButton');
const countdownDisplay = document.getElementById('countdown');


let countdown = 3;
let countdownInterval;
let holdStartTime = null;
let isFrozen = false;


function detectRedBall() {
	// if (isFrozen) return;
	const width = video.videoWidth;
	const height = video.videoHeight;
	if (width === 0 || height === 0) return;

	canvas.width = width;
	canvas.height = height;
	ctx.drawImage(video, 0, 0, width, height);
	const frame = ctx.getImageData(0, 0, width, height);
	const data = frame.data;

	let centerRedPixels = 0;
	let redPixels = 0;
	let sumX = 0, sumY = 0;
	const centerX = Math.floor(width / 2);
	const centerY = Math.floor(height / 2);
	const centerRadius = 100;

	for (let y = centerY - centerRadius; y < centerY + centerRadius; y++) {
		for (let x = centerX - centerRadius; x < centerX + centerRadius; x++) {
			const i = (y * width + x) * 4;
			const r = data[i], g = data[i + 1], b = data[i + 2];

			if (r > 150 && g < 80 && b < 80) {
				centerRedPixels++;
			}
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			const r = data[i], g = data[i + 1], b = data[i + 2];

			if (r > 150 && g < 80 && b < 80) {
				redPixels++;
				sumX += x;
				sumY += y;
			}
		}
	}

	const avgX = sumX / redPixels;
	const avgY = sumY / redPixels;
	const radius = Math.sqrt(redPixels / Math.PI);
	// Draw detection region
	ctx.beginPath();
	ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
	ctx.strokeStyle = 'yellow';
	ctx.lineWidth = 5;
	ctx.stroke();

	if (redPixels > 100) {
		// Draw bounding circle
		ctx.beginPath();
		ctx.arc(avgX, avgY, radius, 0, 2 * Math.PI);
		ctx.strokeStyle = 'lime';
		ctx.lineWidth = 5;
		ctx.stroke();
		console.log(`Red ball detected at (${avgX}, ${avgY}) with radius ${radius}`);
	}


	if (centerRedPixels > 500) {

		message.textContent = "Red ball detected!";
		if (success_tone.paused) {
			success_tone.muted = false;
			success_tone.play();
		}
	} else {
		if (fail_tone.paused) {
			fail_tone.muted = false;
			fail_tone.play();
		}
		message.textContent = "";
	}
}


function resetCountdown() {
	clearInterval(countdownInterval);
	countdown = 3;
	countdownDisplay.textContent = "";
}


function freezeFrame() {
	isFrozen = true;
	detectRedBall(); // Detect red ball in the frozen frame
	//   const width = video.videoWidth;
	//   const height = video.videoHeight;
	//   canvas.width = width;
	//   canvas.height = height;
	//   ctx.drawImage(video, 0, 0, width, height);
	video.pause();
	setTimeout(() => {
		video.play();
		isFrozen = false;
		message.textContent = "";
	}, 2000);
}

startButton.addEventListener('click', () => {
	startButton.style.display = 'none';
	shootButton.style.display = 'block';
	// shootButton.classList.remove("hidden");
	success_tone.play().catch(() => { }); // Prime the audio
	//   success_tone.mute = false; // Mute the success tone initially
	startDetection();
});

function startDetection() {
	navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
		.then(stream => {
			video.srcObject = stream;
			// setInterval(detectRedBall, 300);
		})
		.catch(err => {
			alert('Camera access denied: ' + err);
		});
}

function handleHoldStart() {
	holdStartTime = Date.now();
	countdownDisplay.textContent = "Pulling arrow";

	countdownInterval = setInterval(() => {
		countdown--;
		let countdown_msg = "Release to shoot";
		if (countdown > 0) {
			countdown_msg = "Pulling arrow" + ".".repeat(3 - countdown % 3);
		}
		countdownDisplay.textContent = countdown_msg;
		if (countdown <= 0) {
			clearInterval(countdownInterval);
		}
	}, 1000);
}

function handleHoldEnd() {
	const heldTime = Date.now() - holdStartTime;
	if (heldTime >= 3000 && !isFrozen) {
		freezeFrame();
	}
	resetCountdown();
}

// Mouse events
shootButton.addEventListener('mousedown', handleHoldStart);
shootButton.addEventListener('mouseup', handleHoldEnd);
shootButton.addEventListener('mouseleave', resetCountdown);

// Touch events
shootButton.addEventListener('touchstart', (e) => {
	e.preventDefault();
	handleHoldStart();
});
shootButton.addEventListener('touchend', (e) => {
	e.preventDefault();
	handleHoldEnd();
});
shootButton.addEventListener('touchcancel', (e) => {
	e.preventDefault();
	resetCountdown();
});
