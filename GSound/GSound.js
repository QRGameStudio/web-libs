/**
 * @typedef {number} GSoundStatus
 * @typedef {number} GToneFrequency
 * @typedef {string | number | GToneFrequency} GToneInput
 * @typedef {Array<[Array<GToneInput>, number]>} GTonesSequenceInput
 **/

/**
 * @enum {GSoundStatus}
 */
const GSoundStatus = {'off': 0, 'fx': 1, 'music': 2};

/**
 * Static instance of the volume control, shall be obtained by calling GVolume.prototype.get()
 * @constructor
 */
function GVolume() {
    GVolume.prototype.instance = this;
    const storage = new GStorage("sound");

    /**
     * Default volume is 0 until loaded from storage
     * @type {number|null}
     */
    let volume = 0;

    /**
     * Is set to of until loaded from storage
     * @type {GSoundStatus|null}
     */
    let status = null;

    /**
     * @type {null|AudioContext}
     */
    let audioCtx = null;

    /**
     * @type {null|Promise<void>}
     */
    let savedStateLoader = null;

    let lastSessionStorageSync = Date.now();

    const sessionStorageKeyStatus = '_soundStatus';
    const sessionStorageKeyVolume = '_soundVolume';

    /**
     * Loads saved state from storage
     * @return {Promise<void>} returns when loaded from storage
     */
    function loadSavedState() {
        if (savedStateLoader) {
            return new Promise((resolve) => {
                savedStateLoader.then(() => resolve);
            });
        }
        savedStateLoader = new Promise(async (resolve) => {
            volume = await storage.get('volume', 100);
            status = await storage.get('status', GSoundStatus.fx);
            setTimeout(() => syncSessionStorage(true));
            resolve();
        });
        return savedStateLoader;
    }

    /**
     * Synchronizes sound settings between game and settings when changed during the game
     * @param put save settings instead of get new values, defaults to false
     * @returns {Promise<void>}
     */
    async function syncSessionStorage(put=false) {
        if (volume === null || status === null) {
            return await loadSavedState();
        }
        if (put) {
            sessionStorage.setItem(sessionStorageKeyStatus, `${status}`);
            sessionStorage.setItem(sessionStorageKeyVolume, `${volume}`);
            return;
        }

        // sync every half a second
        if (Date.now() - lastSessionStorageSync > 500) {
            volume = Number(sessionStorage.getItem(sessionStorageKeyVolume));
            status = Number(sessionStorage.getItem(sessionStorageKeyStatus));
            lastSessionStorageSync = Date.now();
        }
    }

    /**
     * Loads saved status from storage/memory if already loaded
     * @return {Promise<GSoundStatus>}
     */
    this.getStatus = async () => {
        await syncSessionStorage();
        return status;
    }

    /**
     * Sets a new status for enabled music
     * @param {GSoundStatus} val
     * @param {boolean} save if true, saves the new value to the storage
     * @return {Promise<boolean>} returns after the value was saved to the storage
     */
    this.setStatus = async (val, save = true) => {
        status = val;
        syncSessionStorage(true).then();
        if (save) {
            return storage.set('status', status);
        }
        return true;
    };

    // noinspection JSUnusedGlobalSymbols
    /**
     * Loads saved volume from storage/memory if already loaded
     * @return {Promise<number>}
     */
    this.getVolume = async () => {
        await syncSessionStorage();
        return volume;
    }

    /**
     * Sets and saves volume to the storage
     * @param {number} val sets the value of the volume (0-100)
     * @param {boolean} save if true, saves the new value to the storage
     * @returns {Promise<boolean>} returns after the value was saved to the storage
     */
    this.setVolume = async (val, save = true) => {
        console.assert(0 <= val && val <= 100, `Invalid percentage (${val} != <0; 100>)`);
        volume = val;
        syncSessionStorage(true).then();
        if (save) {
            return storage.set('volume', val);
        }
        return true;
    };

    /**
     * Counts the volume for the sound
     * @param {number} val relative percentage of global volume (0-100)
     * @param type {GSoundStatus} the type of the sound to play, defaults to effect
     * @returns  {Promise<number>} volume that should be used to play this sound
     */
    this.countVolume = async (val = 100, type = GSoundStatus.fx) => {
        if (await this.getStatus() < type) {
            return Promise.resolve(0);
        }
        const volume = await this.getVolume();
        return volume * val / 100;
    }

    /**
     * Gets audio context
     * @returns {AudioContext}
     */
    this.getAudioContext = () => {
        if (audioCtx === null) {
            audioCtx = new window.AudioContext();
        }
        return audioCtx;
    }
}

/**
 * @type {GVolume|null}
 */
GVolume.prototype.instance = null;

/**
 * @return {GVolume}
 */
GVolume.prototype.get = () => GVolume.prototype.instance ? GVolume.prototype.instance : new GVolume();


/**
 * The smallest part of the GSound, the tone itself
 * @param {GToneInput} tone tone name or tone frequency or GToneFrequency
 * @param {number} duration duration of the tone in milliseconds
 * @param {number} volume relative percentage of global volume (0-100)
 * @param {GSoundStatus} type type of the tone
 * @constructor
 */
function GTone(tone, duration = 200, volume = 100, type = GSoundStatus.fx) {
    /**
     * @type {GToneFrequency}
     */
    const frequency = GTone.prototype.tone2freq(tone);
    /**
     * @type {GVolume}
     */
    const volumeControl = GVolume.prototype.get();

    /**
     * Plays this tone for specified duration
     * @return {Promise<void>} resolves after this tone is finished
     */
    this.play = () => {
        return new Promise(async (resolve) => {
            const audioCtx = volumeControl.getAudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            volume = await volumeControl.countVolume(volume, type);

            // start the oscillator only if the value can be heard
            if (volume >= 0.1) {
                gainNode.gain.value = volume / 100;
                oscillator.frequency.value = frequency;
                oscillator.type = 'triangle';
                oscillator.start();
            }
            setTimeout(() => {
                if (volume > 0.1) {
                    oscillator.stop();
                }
                resolve();
            }, duration);
        });
    };

    /**
     * Changes local relative volume to the global volume
     * @param {number} val local relative volume to the global volume (0-100)
     */
    this.setVolume = (val) => {
        console.assert(0 <= val && val <= 100, `Invalid percentage (${val} != <0; 100>)`);
        volume = val;
    }
}

/**
 * Converts tone into GToneFrequency
 * @param {GToneInput} tone tone name or tone frequency or GToneFrequency
 * @returns {GToneFrequency | 0}
 */
GTone.prototype.tone2freq = (tone) => {
    if (typeof tone === 'number') {
        return tone;
    }

    tone = tone.toUpperCase();
    if (!(/.*[0-9]+$/.test(tone))) {
        tone += '3';
    }

    return GToneMap[tone] || 0;
}

// noinspection JSUnusedGlobalSymbols
/**
 * Creates a song from tones
 * @param {Array<GToneInput>} tones tones to play
 * @param {number} tonesPerSecond  how many tones should be played per second
 * @param {number} pausePercentage how many % of the tone should be silent (0-100)
 * @constructor
 */
function GSong(tones, tonesPerSecond = 3, pausePercentage = 20) {
    console.assert(0 <= pausePercentage && pausePercentage <= 100, "Invalid percentage");
    pausePercentage /= 100;
    const toneDuration = 1000 / (tonesPerSecond * (1 + pausePercentage));
    const pauseDuration = toneDuration * pausePercentage;
    const pauseTone = new GTone(0, pauseDuration);

    /**
     * @type {Array<GTone>}
     */
    const gTones = tones.map((tone) => {
        if (tone instanceof GTone) {
            return tone;
        }
        return new GTone(tone, toneDuration);
    });

    /**
     * Plays this song
     * @return {Promise<void>} after playing finishes
     */
    this.play = async () => {
        for (let i = 0; i < gTones.length; i++) {
            await gTones[i].play();
            await pauseTone.play();
        }
    };
}


/**
 * Sequence of tones
 * @param {GTonesSequenceInput} seq sequence that will be played
 * @param {GSoundStatus} type type of the sequence, defaults to effect
 * @constructor
 */
function GTonesSequence(seq, type = GSoundStatus.fx) {
    let tonesGroups = [];
    let stopped = false;

    let volume = 100;

    seq.forEach((x) => tonesGroups.push(x[0].map((t) => new GTone(t, x[1], volume, type))));

    /**
     * Plays create sequence
     * @param {number} repeatCount how many times to repeat, -1 newer stops
     * @return {Promise<void>} after the play has finished
     */
    this.play = async (repeatCount = 0) => {
        stopped = false;
        do {
            for (let group of tonesGroups) {
                await Promise.all(group.map(t => {
                    t.setVolume(volume);
                    return t.play();
                }));
                if (stopped) {
                    break;
                }
            }
            repeatCount -= 1;
        } while (!stopped && repeatCount !== -1);
    };

    /**
     * Changes local relative volume to the global volume (0-100)
     * @param {number} val local relative volume to the global volume
     */
    this.setVolume = (val) => {
        volume = val;
    }

    /**
     * Stops playing this sequnce immediately
     */
    this.stop = () => {
        stopped = true;
    }
}

// noinspection JSUnusedGlobalSymbols
/**
 * Library of playable effects and songs
 * @constructor
 */
function GSongLib() {
    const storage = new GStorage('songs');
    let storageLoaded = false;

    /**
     * @type {Object.<string, GTonesSequenceInput>}
     */
    this.cache = {};

    /**
     * Downloads library from the API and saves into cache
     * @return {Promise<boolean>} after local cache was loaded
     */
    this.downloadOnlineSongs = async () => {
        let response = await fetch(`https://api.qrpr.eu/music/library`);
        Object.assign(this.cache, await response.json());
        return storage.set('cache', this.cache);
    }

    /**
     * Fetches the library from local library file
     * @return {Promise<boolean>} true on success, false otherwise
     */
    this.fetchLocalSaved = async () => {
        try {
            let response = await fetch(`data/music.json`);
            Object.assign(this.cache, await response.json());
        } catch (_) {
            return false;
        }
        return storage.set('cache', this.cache);
    }

    /**
     * Gets the tone sequence if exists, loads the cache if not yet loaded
     * @param {string} name name of the sequence to get
     * @return {Promise<null|GTonesSequence>} the sequence if exists, null otherwise
     */
    this.get = async (name) => {
        if (!storageLoaded) {
            Object.assign(this.cache, await storage.get('cache', {}))
            storageLoaded = true;
        }

        if (!(name in this.cache)) {
            await this.fetchLocalSaved() || await this.downloadOnlineSongs();
        }
        if (!name in this.cache) {
            return null;
        }

        const isSong = name.toLowerCase().startsWith('song');
        return new GTonesSequence(this.cache[name], isSong ? GSoundStatus.music : GSoundStatus.fx);
    }

    /**
     * Gets and plays the sequence by name
     * @param {string} name name of the sequence to play
     * @param {number} repeatCount how many times to repeat
     * @param {number} volume local relative volume to the global volume (0-100)
     * @return {Promise<null|boolean>} true if sequence exists, null if it does not exist
     */
    this.play = async (name, repeatCount = 0, volume = 100) => {
        /**
         * @type {null|GTonesSequence}
         */
        const seq = await this.get(name);
        if (seq) {
            seq.setVolume(volume);
            await seq.play(repeatCount);
            return true;
        }

        return null;
    }
}

/**
 * @enum {GToneFrequency}
 */
const GToneMap = {
    "C0": 16.35,
    "C#0": 17.32,
    "D0": 18.35,
    "D#0": 19.45,
    "E0": 20.6,
    "F0": 21.83,
    "F#0": 23.12,
    "G0": 24.5,
    "G#0": 25.96,
    "A0": 27.5,
    "A#0": 29.14,
    "B0": 30.87,
    "C1": 32.7,
    "C#1": 34.65,
    "D1": 36.71,
    "D#1": 38.89,
    "E1": 41.2,
    "F1": 43.65,
    "F#1": 46.25,
    "G1": 49,
    "G#1": 51.91,
    "A1": 55,
    "A#1": 58.27,
    "B1": 61.74,
    "C2": 65.41,
    "C#2": 69.3,
    "D2": 73.42,
    "D#2": 77.78,
    "E2": 82.41,
    "F2": 87.31,
    "F#2": 92.5,
    "G2": 98,
    "G#2": 103.83,
    "A2": 110,
    "A#2": 116.54,
    "B2": 123.47,
    "C3": 130.81,
    "C#3": 138.59,
    "D3": 146.83,
    "D#3": 155.56,
    "E3": 164.81,
    "F3": 174.61,
    "F#3": 185,
    "G3": 196,
    "G#3": 207.65,
    "A3": 220,
    "A#3": 233.08,
    "B3": 246.94,
    "C4": 261.63,
    "C#4": 277.18,
    "D4": 293.66,
    "D#4": 311.13,
    "E4": 329.63,
    "F4": 349.23,
    "F#4": 369.99,
    "G4": 392,
    "G#4": 415.3,
    "A4": 440,
    "A#4": 466.16,
    "B4": 493.88,
    "C5": 523.25,
    "C#5": 554.37,
    "D5": 587.33,
    "D#5": 622.25,
    "E5": 659.25,
    "F5": 698.46,
    "F#5": 739.99,
    "G5": 783.99,
    "G#5": 830.61,
    "A5": 880,
    "A#5": 932.33,
    "B5": 987.77,
    "C6": 1046.5,
    "C#6": 1108.73,
    "D6": 1174.66,
    "D#6": 1244.51,
    "E6": 1318.51,
    "F6": 1396.91,
    "F#6": 1479.98,
    "G6": 1567.98,
    "G#6": 1661.22,
    "A6": 1760,
    "A#6": 1864.66,
    "B6": 1975.53,
    "C7": 2093,
    "C#7": 2217.46,
    "D7": 2349.32,
    "D#7": 2489.02,
    "E7": 2637.02,
    "F7": 2793.83,
    "F#7": 2959.96,
    "G7": 3135.96,
    "G#7": 3322.44,
    "A7": 3520,
    "A#7": 3729.31,
    "B7": 3951.07,
    "C8": 4186.01,
    "C#8": 4434.92,
    "D8": 4698.63,
    "D#8": 4978.03,
    "E8": 5274.04,
    "F8": 5587.65,
    "F#8": 5919.91,
    "G8": 6271.93,
    "G#8": 6644.88,
    "A8": 7040,
    "A#8": 7458.62,
    "B8": 7902.13
}
