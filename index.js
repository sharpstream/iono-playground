import "./styles/style.scss";

import moment from "moment";
import momentDurationFormatSetup from "moment-duration-format";
window.moment = moment;

import axios from 'axios';
window.axios = axios;

import VueCircleSlider from 'vue-circle-slider'
import webvtt from 'node-webvtt';

import iziToast from 'izitoast'// https://github.com/dolce/iziToast
import 'izitoast/dist/css/iziToast.min.css'

new Vue({
    el: '#app',
    components: {
        VueCircleSlider
    },
    data() {
        return {
            volume: 10,
            muteButtonText: 'Mute',
            playButtonText: 'Play',
            player: null,
            playing: false,
            playlist: [],
            duration: 0,
            progressBar: null,
            position: 0,
            events: "",
            currentPlaylistIndex: 0,
            bannerImage: null, // banners[0].url
            smallImage: null,  // icons[0].url
            mediumImage: null,  // icons[1].url,
            title: '',
            description: '',
            playbackRate: 1.0,
            language: 'en',
            // GH: Enable media preloading
            preload: true,
            textTracksEnabled: true,
            qualityLevel: 'high',
            bufferedPercentage: 0,
            captionsText: '',
            chapterText: '',
            chapters: []
        }
    },

    watch: {
        volume: function (newVolume) {
            this.player.setVolume(newVolume / 100);
        }
    },

    beforeMount() {
        this.getPlaylist();
    },

    filters: {
        formatDuration(value) {
            // GH: because we're loading the player as a deferred script,
            // the iono namespace is not available until the page is fully loaded
            if (window.iono) {
                return iono.Player.formatSeconds(value);
            } else {
                return "00:00";
            }
        }
    },
    mounted() {
        let main = () => {
            const player = window.player = new iono.Player({
                'language': this.language,
                'playbackRate': this.playbackRate,
                'preload': this.preload,
                // 'repeat': 'playlist'
                'textTracksEnabled': this.textTracksEnabled,
                'volume': this.volume / 100,
                'qualityLevel': this.qualityLevel
                //  'analyticsLabel': '<url>',
                //  'analyticsCategory': 'Audio playback',
                //  'analyticsURL': 'https://example.com/submit'
            });
            this.player = player;
            this.player.ready(() => {
                this.progressBar = document.getElementById("progress-bar");

                this.setupEvents();                      // setup iono player even listeners

                // GH: Is there a reason you do this here? Does passing these as options to the player not work?
                this.player.setVolume(this.volume / 100) // set volume to the initial on start
                this.player.setTextTracksEnabled(true);

                this.player.load(this.playlist);         // load playlist
            });
        }
        // Wait for the DOM to load and initialise the player
        window.addEventListener("DOMContentLoaded", main);
    },

    methods: {
        setupEvents() {

            this.player.on("play", () => {
                this.playing = true;
                this.playButtonText = "Pause";

                this.smallImage = this.player.getPlaylistItem().metadata.icons[0].url;
                this.mediumImage = this.player.getPlaylistItem().metadata.icons[1].url;
                this.bannerImage = this.player.getPlaylistItem().metadata.banners[0].url;
                this.title = this.player.getPlaylistItem().metadata.title;
                this.description = this.player.getPlaylistItem().metadata.description;

                iziToast.show({
                    id: 'now-playing',
                    title: this.title,
                    message: this.description,
                    displayMode: 'replace',
                    close: false,
                    position: 'topCenter',
                    pauseOnHover: false,
                    image: this.smallImage
                });
            });

            this.player.on("pause", () => {
                this.playing = false;
                this.playButtonText = "Play";
            });

            // update the volume ui when the playback volume is changed, muted or unmuted
            this.player.on("volumechange", () => {
                this.muteButtonText = this.player.getMute()
                    ? "Unmute"
                    : "Mute";
            });

            this.player.on("seeking", (e) => {
                console.log('seeking');
            });

            this.player.on("playlistselect", () => {
                // GH: The following bug should be fixed
                // BUG?!!: WHILE PAUSED!, moving through playlist from start to finish 2 times first index always returns duration of -1
                // this.player.setPreload(true) fixes it but it is still shouldn't happen!
                // console.log(this.duration);

                // workaround below prevents -1 but causes The provided double value is non-finite. error and need to press play twice to play or go to next playlist
                /*if (this.player.getDuration() === -1) {
                    this.player.load(this.playlist);   // load playlist again
                    this.duration = this.player.getDuration();
                }
                else {
                    this.duration = this.player.getDuration();
                }*/
                // below how it should just work.
                this.duration = this.player.getDuration();
                this.currentPlaylistIndex = this.player.getPlaylistIndex();
            });

            this.player.on("durationchange", () => {
                this.duration = this.player.getDuration();
                // Event: duration change always called twice
                console.log('DEBUG: duration changed');
            });

            // update the position on the ui when the current playback position changes
            this.player.on("timeupdate", (event) => {
                this.position = this.player.getPosition();
                this.progressBar.value = this.position / this.duration;
            });

            /*** LOGS ***/
            // listen for tracking events and log them to the console
            this.player.on("tracking", (event) => {

                console.log(event);
                // action tracking events
                if (event.details.event === "action") {
                    this.events += `TrackingEvent(action): ${event.details.action} (${event.details.uid})\n`;
                }
                // position tracking events
                if (event.details.event === "position") {
                    this.events += `TrackingEvent(position): ${event.details.position} (${event.details.uid})\n`;
                }

            });
            /*** END LOGS ***/

            this.player.on("texttrackschange", (event) => {
                console.log(event);

                // update the list of chapters
                this.chapters = this.player.getChapters();
            });

            this.player.on("textcuechange", (event) => {
                console.log(event);

                const chapter = this.player.getCurrentChapter();
                const captions = this.player.getCurrentCaptions();

                // GH: build current chapter text
                this.chapterText = (chapter && chapter.text) || '';

                // GH: build current captions text - it is possible to have multiple captions at the same time
                //  so we need to make sure we render them all. Here I just map over them to get an array
                //  of text strings, then join them together with new lines.
                this.captionsText = (captions || []).map(caption => {
                    return caption.text;
                }).join('\n');

                // GH: build and show the captions text in a toast ui
                if (this.captionsText) {
                    iziToast.info({
                        icon: false,
                        id: 'captions',
                        title: this.chapterText,
                        message: this.captionsText,
                        displayMode: 'replace',
                        close: false,
                        position: 'bottomCenter',
                        pauseOnHover: false,
                        image: false
                    });
                }
            });

            this.player.on("progress", (event) => {
                this.bufferedPercentage = this.player.getBufferedPercentage();
                console.log(event);
            });
        },

        togglePlay() {
            this.player.togglePlay();
        },

        toggleMute() {
            this.player.toggleMute();
        },

        previousPlaylistItem() {
            // GH: Not sure the use-case for this, this would move to the previous playlist item then attempt to seek to the position
            //  of the current playlist item: eg. click previous on playlist item 2 at position 10, moves to playlist item 1, then tries to seek to 10s
            //  Also not that we are still in the process of deciding whether or not to allow seeking until the media element has loaded enough audio data,
            //  which would mean you can't seek until the player reaches the 'playing' or 'paused' states.
            if (this.player.previousPlaylistItem()) {
                this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration);
            }
            else {
                iziToast.info({
                    id: 'playlist',
                    title: 'Beginning of Playlist',
                    displayMode: 'replace'
                });
            }
        },

        nextPlaylistItem() {
            // GH: Same question as with `previousPlaylistItem`
            if (this.player.nextPlaylistItem()) {
                this.player.setPosition(this.progressBar.offsetX / this.progressBar.offsetWidth * this.duration);
            }
            else {
                iziToast.info({
                    id: 'playlist',
                    title: 'End of Playlist',
                    displayMode: 'replace'
                });
            }
        },

        progressBarClicked() {
            this.player.setPosition(event.offsetX / this.progressBar.offsetWidth * this.duration);
        },

        async logInfo() {
            await console.log(this.player.getPlaylist());
            await console.log(this.player.getPlaylistIndex());
            await console.log(this.player.getPlaylistItem());
            await console.log(this.player.getTextTracks());
            await console.log(this.player.getChapters()); // ALWAYS returns index 0 chapter (how does this work?)
            await console.log(this.player.getCurrentChapter()); // ALWAYS retuns false (how does this work?)

            // get vtt file contents asynchronously
            if (this.player.getTextTracks().length) {
                let vtt = await axios.get(this.player.getTextTracks()[0]['url']);
                let parsed = webvtt.parse(vtt.data);

                if (parsed.valid) {
                    console.log('VTT LOADED SUCCESSFULLY!');
                    console.log(parsed);
                }
                else {
                    console.log('VTT FAILED TO LOAD!');
                }
            }
            else {
                console.log(`No tracks are available for playlist index: ${this.player.getPlaylistIndex()}`)
            }
        },

        playlistItemSelect(index) {
            this.player.selectPlaylistItem(index);
        },

        async getPlaylist() {
            let response = await axios.get("./assets/playlist.json");
            this.playlist = response.data;
        }

    },
})
