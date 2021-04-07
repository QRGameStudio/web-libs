// noinspection JSUnusedGlobalSymbols
/**
 *  Collections of utils for games
 * @type {{degToRad: (function(number): number),
 * countAngle: ((function(number, number): number)),
 * radToDeg: (function(number): number),
 * ud: (function(string): string)}}
 */
const GUt = {
    /**
     * Unicode decode
     * @param {string} base64string base64 encoded unicode string
     * @returns {string} original string
     */
    ud: (base64string) => {
        return decodeURIComponent(atob(base64string).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
    },
    /**
     * Converts radians into degrees
     * @param radians {number}
     * @return {number}
     */
    radToDeg: (radians) => {
      return radians * (180/Math.PI);
    },
    /**
     * Converts degrees into radians
     * @param degrees {number}
     * @return {number}
     */
    degToRad: (degrees) => {
        return degrees / (Math.PI / 180);
    },
    /**
     * Counts an angle in which a point [dx, dy] is seen from point [0, 0]
     * @param dx {number}
     * @param dy {number}
     * @return {number}
     */
    countAngle: (dx, dy) => {
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
}
