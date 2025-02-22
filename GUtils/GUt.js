// noinspection JSUnusedGlobalSymbols
/**
 *  Collections of utils for games
 */
class GUt {
    /**
     * Unicode decode
     * @param {string} base64string base64 encoded unicode string
     * @returns {string} original string
     */
    static ud (base64string) {
        return decodeURIComponent(atob(base64string).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    }

    /**
     * Converts radians into degrees
     * @param radians {number}
     * @return {number}
     */
    static radToDeg (radians) {
      return radians * (180 / Math.PI);
    }

    /**
     * Converts degrees into radians
     * @param degrees {number}
     * @return {number}
     */
    static degToRad (degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Counts an angle in degrees in which a point [dx, dy] is seen from point [0, 0]
     * @param dx {number}
     * @param dy {number}
     * @return {number}
     */
    static countAngle(dx, dy) {
        if (dx === 0  && dy === 0) {
            return 0;
        }
        if (dx === 0) {
            return dy > 0 ? 90 : 270;
        }
        if (dy === 0) {
            return dx > 0 ? 0 : 180;
        }
        if (dx > 0 && dy > 0) {
            return GUt.radToDeg(Math.atan(Math.abs(dy) / Math.abs(dx)));
        }
        if (dx < 0 && 0 < dy) {
            const base = GUt.radToDeg(Math.atan(Math.abs(dx) / Math.abs(dy)));
            return base + 90;
        }
        if (dx < 0 && dy < 0) {
            const base = GUt.radToDeg(Math.atan(Math.abs(dy) / Math.abs(dx)));
            return base + 180;
        }
        const base = GUt.radToDeg(Math.atan(Math.abs(dx) / Math.abs(dy)));
        return base + 270;
    }

    /**
     * Counts dx and dy from angle and distance
     * @param angle {number} angle in degrees
     * @param distance {number} distance
     * @return {{dx: number, dy: number}}
     */
    static countDxDy(angle, distance) {
        const rad = GUt.degToRad(angle);
        return {
            dx: Math.cos(rad) * distance,
            dy: Math.sin(rad) * distance
        };
    }

    /**
     * Transforms relative angle <-180, 180> to absolute angle <0, 360>
     * @param angle {number} relative or absolute angle
     * @return {number} absolute angle
     */
    static absoluteAngle(angle) {
        return ((angle % 360) + 360) % 360;
    }

    /**
     * Transforms relative absolute angle <0, 360> to angle <-180, 180>
     * @param angle {number} relative or absolute angle
     * @return {number} relative angle
     */
    static relativeAngle(angle) {
        angle = GUt.absoluteAngle(angle);
        if (angle > 180) {
            angle = -(360 - angle);
        }
        return angle;
    }

    /**
     * Computes point position relative to the center with given rotation
     * @param centerX {number} x position of the center
     * @param centerY {number} y position of the center
     * @param rotationDeg {number} rotation of the center
     * @param deltaX {number} x distance
     * @param deltaY {number} y distance
     * @return {{x: number, y: number}} absolute point coordinates
     */
    static pointRelativeTo(centerX, centerY, rotationDeg, deltaX, deltaY) {
        const absoluteRotation = rotationDeg + GUt.countAngle(deltaX, deltaY);
        const distance = Math.sqrt((deltaX ** 2) + (deltaY ** 2 ));
        const x = centerX + distance * Math.cos(GUt.degToRad(absoluteRotation));
        const y = centerY + distance * Math.sin(GUt.degToRad(absoluteRotation));
        return {x, y};
    }

    /**
     * Computes point position relative to the center with given rotation
     * @param centerX {number} x position of the center
     * @param centerY {number} y position of the center
     * @param rotationDeg {number} rotation of the center
     * @param distance {number} distance from the center
     * @param angle {number} angle of the point
     * @return {{x: number, y: number}} absolute point coordinates
     */
    static pointRelativeToAngle(centerX, centerY, rotationDeg, distance, angle) {
        const absoluteRotation = rotationDeg + angle;
        const x = centerX + distance * Math.cos(GUt.degToRad(absoluteRotation));
        const y = centerY + distance * Math.sin(GUt.degToRad(absoluteRotation));
        return {x, y};
    }

    /**
     * Crops canvas and returns it as new cropped canvas
     * @param source {HTMLCanvasElement}
     * @param x {number}
     * @param y {number}
     * @param width {number}
     * @param height {number}
     * @param target {HTMLCanvasElement} if specified, this canvas is overwritten
     * @return {HTMLCanvasElement}
     */
    static cropCanvas(source, x, y,width,height, target) {
        target = target !== null ? target : document.createElement('canvas');
        target.width = width;
        target.height = height;
        target.getContext('2d').drawImage(source, x, y, width, height, 0, 0, width, height);
        return target;
    }

    /**
     * Test if the device is in landscape or portrait mode
     * @return boolean
     */
    static isLandscape () {
        const { width, height } = document.body.getBoundingClientRect();
        console.debug('[GUt] Screen size', width, height);
        return width > height;
    }

    /**
     * Generates UUIDv4
     * @return {string} uuid
     */
    static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
