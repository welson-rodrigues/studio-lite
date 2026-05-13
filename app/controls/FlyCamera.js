import { PointerLockControls } from "./PointerLockControls.js";

export default class FlyCamera {
	/**
	 * 
	 * @param {*} cam THREE.PerspectiveCamera to control
	 * @param {*} domElement The DOM element to listen for click & key events on
	 */
	constructor(cam, domElement) {
		this.cam = cam;
		this.domElement = domElement;
		this.movementSpeed = 0;
		this.horizontalMovementSpeed = 0;
		this.verticalMovementSpeed = 0;
		this.flySpeed = 5;
		// this.lookSpeed = 0.005;
		this.controls = new PointerLockControls(this.cam, this.domElement);

		/**
		 * Locks mouse on click
		 */
		domElement.addEventListener('click', () => {
			this.controls.lock();
		});

		// Touch support for mobile devices
		let lastTouchX = 0;
		let lastTouchY = 0;
		let isTouchLocked = false;

		domElement.addEventListener('touchstart', (e) => {
			if (e.touches.length === 1) {
				lastTouchX = e.touches[0].clientX;
				lastTouchY = e.touches[0].clientY;
				if (!this.controls.isLocked) {
					this.controls.lock();
					isTouchLocked = true;
				}
			}
		}, { passive: false });

		domElement.addEventListener('touchmove', (e) => {
			if (e.touches.length === 1 && this.controls.isLocked) {
				e.preventDefault();
				const currentX = e.touches[0].clientX;
				const currentY = e.touches[0].clientY;
				const movementX = currentX - lastTouchX;
				const movementY = currentY - lastTouchY;

				// Simulate mouse movement for camera rotation
				this._applyTouchMovement(movementX, movementY);

				lastTouchX = currentX;
				lastTouchY = currentY;
			}
		}, { passive: false });

		domElement.addEventListener('touchend', (e) => {
			if (e.touches.length === 0) {
				isTouchLocked = false;
			}
		}, { passive: false });
		/**
		 * Sets movement directions based on key presses
		 */
		window.addEventListener("keydown", (e) => {
			if (!this.controls.isLocked) return;
			switch (e.code) {
				case "KeyW":
					this.moveForward = true;
					break;
				case "KeyS":
					this.moveBackward = true;
					break;
				case "KeyA":
					this.moveLeft = true;
					break;
				case "KeyD":
					this.moveRight = true;
					break;
				case "KeyE":
					this.moveUp = true;
					break;
				case "KeyQ":
					this.moveDown = true;
					break;
			}
		});
		/**
		 * Sets movement directions based on key releases
		 */
		window.addEventListener("keyup", (e) => {
			if (!this.controls.isLocked) return;
			switch (e.code) {
				case "KeyW":
					this.moveForward = false;
					break;
				case "KeyS":
					this.moveBackward = false;
					break;
				case "KeyA":
					this.moveLeft = false;
					break;
				case "KeyD":
					this.moveRight = false;
					break;
				case "KeyE":
					this.moveUp = false;
					break;
				case "KeyQ":
					this.moveDown = false;
					break;
			}
		});
	}

	_applyTouchMovement(movementX, movementY) {
		// Simulate mouse movement event for the PointerLockControls
		// This allows touch swipes to rotate the camera just like mouse movement
		const fakeEvent = {
			movementX: movementX,
			movementY: movementY
		};

		if (this.controls._onMouseMove) {
			this.controls._onMouseMove(fakeEvent);
		}
	}

	/**
	 * Updates this.cam position based on movement directions
	 * @param {number} dt 
	 */
	update(dt) {
		if (!this.controls.isLocked) return;
		// console.log(this.moveForward);
		if (this.moveForward) {
			// console.log("forward");
			if (this.movementSpeed < 50) {
				this.movementSpeed += this.flySpeed;
			}
		} else if (this.moveBackward) {
			if (this.movementSpeed > -50) {
				this.movementSpeed -= this.flySpeed;
			}
		} else {
			if (this.movementSpeed > 0) {
				this.movementSpeed -= this.flySpeed;
			} else if (this.movementSpeed < 0) {
				this.movementSpeed += this.flySpeed;
			}
		}
		if (this.moveLeft) {
			if (this.horizontalMovementSpeed > -50) {
				this.horizontalMovementSpeed -= this.flySpeed;
			}
		} else if (this.moveRight) {
			if (this.horizontalMovementSpeed < 50) {
				this.horizontalMovementSpeed += this.flySpeed;
			}
		} else {
			if (this.horizontalMovementSpeed > 0) {
				this.horizontalMovementSpeed -= this.flySpeed;
			} else if (this.horizontalMovementSpeed < 0) {
				this.horizontalMovementSpeed += this.flySpeed;
			}
		}
		if (this.moveUp) {
			if (this.verticalMovementSpeed < 50) {
				this.verticalMovementSpeed += this.flySpeed;
			}
		} else if (this.moveDown) {
			if (this.verticalMovementSpeed > -50) {
				this.verticalMovementSpeed -= this.flySpeed;
			}
		} else {
			if (this.verticalMovementSpeed > 0) {
				this.verticalMovementSpeed -= this.flySpeed;
			} else if (this.verticalMovementSpeed < 0) {
				this.verticalMovementSpeed += this.flySpeed;
			}
		}
		this.cam.translateX(this.horizontalMovementSpeed * dt);
		this.cam.translateY(this.verticalMovementSpeed * dt);
		this.cam.translateZ(-this.movementSpeed * dt);
	}
}