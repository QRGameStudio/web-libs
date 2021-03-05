/**
 * Peer to peer game multiplayer
 * @constructor
 */
function GMP() {
    const storage = new GStorage("multiplayer");
    const modals = new GModal();
    /**
     * @type GGameMetaData
     */
    const gameData = new GGameData().parseGameData();
    let currentGameId = gameData ? gameData.id : null;

    let myPeer = null;
    let myName = null;

    /**
     * Gets your Peer instance
     * @return {Promise<null|Peer>}  null if cannot connect or multiplayer is not enabled
     */
    this.getMe = async () => {
        if (!await this.isEnabled()) {
            if (! await modals.yesNo('Do you want to connect to the multiplayer server?', 'Enable multiplayer')) {
                return null;
            }
            storage.set('enabled', true).then();
        }

        if (myName === null) {
            storage.get('name', null).then((n) => myName = n);
        }

        if (myPeer !== null) {
            if (!myPeer.disconnected) {
                return myPeer;
            }
            if (!myPeer.destroyed) {
                return await new Promise(resolve => {
                    myPeer.reconnect();
                    myPeer.on('open', () => {
                        resolve(myPeer);
                    });
                })
            }
        }

        const options = {
            host: `peer.qrpr.eu`,
            key: 'qrgames',
            secure: true
        }

        return await new Promise(async (resolve) => {
            const myId = await this.getSavedId();
            if (myId) {
                myPeer = new Peer(myId, options);
            } else {
                myPeer = new Peer(null, options);
            }

            myPeer.on('open', (id) => {
                console.log(`P2P: Running as ${id}`)
                storage.set('id', id);
                resolve(myPeer);
            });
        });
    };

    /**
     * Checks if the multiplayer is enabled
     * @return {Promise<boolean>} true if enabled
     */
    this.isEnabled = async () => await storage.get('enabled', false);

    /**
     * Gets local saved multiplayer ID
     * @return {Promise<string|null>}  null if not enabled/defined yet
     */
    this.getSavedId = async () => await storage.get('id', null);

    /**
     * Connects to another Peer
     * @param {string} id id of the other peer
     * @param {function(string|null): void} dataCallback this function is called whenever connected peer sends data,
     * null means that the connection was closed
     * @return {Promise<Peer|null>}  null if connection failed/was refused
     */
    this.connect = (id, dataCallback) => {
        return new Promise(async resolve => {
            const me = await this.getMe();
            const conn = me.connect(id, {metadata: {name: myName, game: currentGameId}});
            conn.on('open', () => {
                console.debug('[GMP] connection opened with', conn.peer);
                let connectionAccepted = false;
                conn.on('data', (data) => {
                    if (!connectionAccepted) {
                        if (data) {
                            console.debug('[GMP] link established with', conn.peer);
                            resolve(conn);
                            connectionAccepted = true;
                            conn.on('close', () => {
                                console.debug('[GMP] link closed -', conn.peer);
                                dataCallback(null);
                            });
                            conn.on('error', () => {
                                console.debug('[GMP] link error -', conn.peer);
                                dataCallback(null);
                            });
                        } else {
                            console.debug('[GMP] connection denied -', conn.peer);
                            connectionAccepted = true;
                            conn.close();
                            resolve(null);
                        }
                    } else {
                        dataCallback(data);
                    }
                });
            });
        });
    }

    // noinspection JSUnusedGlobalSymbols
    /**
     * Overrides current game ID
     * @param {string|null|"DEBUG"} gameId setting to debug accepts all connections
     */
    this.setCurrentGameId = (gameId) => currentGameId = gameId;

    // noinspection JSUnusedGlobalSymbols
    /**
     * What to do when a new connection is accepted
     * @param {function(Peer): void} callback this function is called with the new connected Peer instance
     * @param {function(string|null): void} dataCallback this function is called whenever connected peer sends data,
     * null means that the connection was closed
     * @return {Promise<void>} returns when the connection system was initialized
     */
    this.onConnection = async (callback, dataCallback) => {
        (await this.getMe()).on('connection', (conn) => {
            console.debug('[GMP] incoming connection from', conn.peer);
            const remoteName = conn.metadata.name || null;
            const remoteGameId = conn.metadata.game || null;

            if (currentGameId !== 'DEBUG' && remoteGameId !== currentGameId) {
                console.debug('[GMP] game ID does not match', conn.peer);
                conn.send(false);
                return;
            }

            modals.yesNo(`${remoteName} want's to play with you in online mode!`, 'Online request').then((response) => {
                if (response) {
                    console.debug('[GMP] link established with', conn.peer);
                    conn.send(true);
                    conn.on('data', (data) => dataCallback(data));
                    conn.on('close', () => {
                        console.debug('[GMP] link closed -', conn.peer);
                        dataCallback(null)
                    });
                    conn.on('error', () => {
                        console.debug('[GMP] link error -', conn.peer);
                        dataCallback(null)
                    });
                    callback(conn);
                } else {
                    console.debug('[GMP] connection denied - ', conn.peer);
                    conn.send(false);
                }
            });
        });
    }
}

/**
 * @typedef {Object} FriendsModalOptions
 * @property {boolean} allowAdd if true, then button for adding new friends is shown
 * @property {boolean} allowDelete if true, then button for deleting friends is shown
 * @property {boolean} allowSelect if true, then clicking on the friends name will resolve with his name
 */

/**
 * Manipulation with multiplayer friends
 * @constructor
 */
function GFriends() {
    const storage = new GStorage("multiplayer");

    /**
     * Fetches locally saved friends in format name: id
     * @return {Promise<{string: string}>}
     */
    this.getFriends = async () => {
        return await storage.get('friends', {});
    }

    /**
     * Adds and saves a new friend and saves it
     * @param {string} id id of the new friend
     * @param {string} name friendly name of the new friend
     * @return {Promise<bool>} true if save was successful
     */
    this.addFriend = async (id, name) => {
        const saved = await this.getFriends();
        saved[name] = id;
        return await storage.set('friends', saved);
    }

    /**
     * Updates saved friends and removes the one specified
     * @param {string} name name of the friend to remove
     * @return {Promise<bool>} true if save was successful
     */
    this.removeFriend = async (name) => {
        const saved = await this.getFriends();
        delete saved[name];
        return await storage.set('friends', saved);
    }

    /**
     * Shows modal with saved friends and allows specified operations
     * @param {FriendsModalOptions} options modifier of the modal
     * @return {Promise<string|void>} if selecting was enabled then returns selected name of the friend, otherwise null after closing
     */
    this.showFriendsModal = (options = {}) => {
        options = Object.assign({
            allowAdd: true,
            allowDelete: false,
            allowSelect: false
        }, options);
        const modals = new GModal();
        const superThis = this;
        return new Promise(resolve => {
            async function inner() {
                const backData = {};
                await modals.show('OnlineFriends',
                    {friends: await superThis.getFriends(), options},
                    {
                        addFriend: async () => {
                            const id = await modals.prompt('', 'Enter your friend\'s ID');
                            const name = id ? await modals.prompt('', 'Enter your friend\'s name') : id;

                            if (id && name) {
                                await superThis.addFriend(id, name);
                                backData.renderer.variables.friends = await superThis.getFriends();
                                backData.renderer.render(backData.renderer.variables.el);
                            }
                        },
                        select: async (name) => {
                            if (options.allowSelect) {
                                resolve(name);
                                backData.renderer.functions.hideModal();
                            }
                        },
                        delete: async (name) => {
                            await superThis.removeFriend(name);
                            backData.renderer.variables.friends = await superThis.getFriends();
                            backData.renderer.render(backData.renderer.variables.el);
                        }
                    }, backData);
            }

            inner().then();
        });
    }
}
