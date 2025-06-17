const axios = require('axios');
const { Builder } = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const AdmZip = require('adm-zip');
const { app } = require('electron');
import sharp from 'sharp';

import logger from './logger';
import asyncQueue from './asyncQueue';

class Generator {
    constructor() {
        this.settings;

        this.sigameFileName;
        this.userDataPath = app.getPath('userData');
        this.folder = path.join(this.userDataPath, 'temp');
        this.subdirs = ['Images', 'Audio'];
        this.BUILDS_PATH = path.join(this.userDataPath, 'builds');
    }

    init(settings) {
        this.settings = settings;
        this.sigameFileName = uuidv4();

        if (fs.existsSync(this.folder)) {
            fs.rmSync(this.folder, { recursive: true });
        }
        fs.mkdirSync(this.folder);
        this.subdirs.forEach(subdir => fs.mkdirSync(path.join(this.folder, subdir)));
        if (!fs.existsSync(this.BUILDS_PATH)) fs.mkdirSync(this.BUILDS_PATH);
        fs.mkdirSync(path.join(this.BUILDS_PATH, `build_${this.sigameFileName}`));
    }

    end() {
        logger.info('Saving package');
        const zip = new AdmZip();
        zip.addLocalFolder(this.folder);
        zip.writeZip(path.join(this.BUILDS_PATH, `build_${this.sigameFileName}`, 'sigame.zip'));

        fs.rmSync(this.folder, { recursive: true });
        fs.renameSync(
            path.join(this.BUILDS_PATH, `build_${this.sigameFileName}`, 'sigame.zip'),
            path.join(this.BUILDS_PATH, `build_${this.sigameFileName}`, 'sigame.siq')
        );
    }

    generateXmlContent(songsMap) {
        const packSongs = [];

        const builder = new Builder();
        const packageObj = {
            package: {
                $: {
                    name: this.settings.pack.title,
                    version: '5',
                    id: '69831e55-f450-4fdf-8200-ee18d9d8d413',
                    xmlns: 'https://github.com/VladimirKhil/SI/blob/master/assets/siq_5.xsd'
                },
                tags: [{ tag: ['Аниме'] }],
                info: {
                    authors: [{ author: ['Kao Generator'] }]
                },
                rounds: {
                    round: []
                }
            }
        };

        let currentId = 0;
        for (let tempRounds = 0; tempRounds < this.settings.pack.content.rounds; tempRounds++) {
            if (currentId >= songsMap.length) break;

            const round = {
                $: { name: `round ${tempRounds + 1}` },
                themes: {
                    theme: []
                }
            };

            for (let tempThemes = 0; tempThemes < this.settings.pack.content.themes; tempThemes++) {
                if (currentId >= songsMap.length) break;

                const theme = {
                    $: { name: this.settings.pack.themeTitle },
                    questions: {
                        question: []
                    }
                };

                let price = 0;
                for (let tempQuestions = 0; tempQuestions < this.settings.pack.content.questions; tempQuestions++) {
                    if (currentId >= songsMap.length) break;

                    const song = songsMap[currentId];

                    const getPrice = (difficulty) => {
                        const priceRanges = [
                            [90, 2],
                            [80, 4],
                            [70, 6],
                            [60, 8],
                            [50, 10],
                            [40, 12],
                            [30, 14],
                            [20, 16],
                            [10, 18],
                            [0, 20]
                        ];

                        for (const [threshold, p] of priceRanges) {
                            if (difficulty >= threshold) return p;
                        }
                        return 1;
                    };

                    price = getPrice(song.songDifficulty);

                    const question = {
                        $: { price: price.toString() },
                        params: {
                            param: [
                                {
                                    $: { name: 'question', type: 'content' },
                                    item: [
                                        {
                                            $: {
                                                type: 'audio',
                                                isRef: 'True',
                                                placement: 'background',
                                                duration: `00:00:${this.settings.other.audioCut - (this.settings.other.images.include ? this.settings.other.images.time : 7)}`
                                            },
                                            _: song.audio
                                        }
                                    ]
                                },
                                {
                                    $: { name: 'answer', type: 'content' },
                                    item: []
                                }
                            ]
                        },
                        right: {
                            answer: [
                                `${song.russian} - ${song.animeJPName} (${song.animeCategory}) - ` +
                                `(${song.songType}) - (${Math.floor(song.songDifficulty)}) - ` +
                                `(${song.songArtist} - ${song.songName})`
                                + (this.settings.lists.random ? '' : ` - (${song.users.join(', ')})`)
                            ]
                        }
                    };

                    if (this.settings.other.images.include) {
                        question.params.param[0].item.push({
                            $: {
                                type: 'image',
                                isRef: 'True',
                                duration: '00:00:01'
                            },
                            _: `${song.annId}.jpg`
                        });
                    }

                    if (!this.settings.lists.random) {
                        question.params.param[1].item.push({
                            $: {
                                waitForFinish: 'False',
                                placement: 'replic'
                            },
                            _: song.users.join(', ')
                        });
                    }

                    question.params.param[1].item.push({
                        $: {
                            type: 'image',
                            isRef: 'True',
                            waitForFinish: 'False',
                            duration: '00:00:03'
                        },
                        _: `${song.annId}_poster.jpg`
                    });

                    question.params.param[1].item.push({
                        _: `${song.russian} ${song.songType}`
                    });

                    theme.questions.question.push(question);
                    packSongs.push(song);
                    currentId++;
                }

                round.themes.theme.push(theme);
            }

            packageObj.package.rounds.round.push(round);
        }

        const xml = builder.buildObject(packageObj);

        return xml;
    }

    async createPackage(songsMap) {
        logger.info('Creating package');

        songsMap = songsMap.splice(0, (this.settings.pack.content.rounds * this.settings.pack.content.themes * this.settings.pack.content.questions));

        const xmlContent = this.generateXmlContent(songsMap);

        fs.writeFileSync(path.join(this.folder, 'content.xml'), xmlContent);

        if (!this.settings.other.asyncDownload) {
            await this.processMediaDownloads(packSongs, folder);
        }
        await asyncQueue.waitUntilAllDone();

        this.end();

        logger.info('Package generation completed');

        return this.BUILDS_PATH;
    }

    async processMediaDownloads(packSongs) {
        for (const song of packSongs) {
            asyncQueue.add(() => generator.downloadSong(tempSong));
            asyncQueue.add(() => generator.downloadImages(tempSong));
        }
    }

    downloadSong = async (song) => {
        if (!song.audio) return;

        const audioFilename = song.audio;
        const finalPath = path.join(this.folder, 'Audio', audioFilename);
        const tempPath = path.join(this.folder, 'Audio', `temp_${audioFilename}`);

        try {
            const response = await axios.get(
                `https://naedist.animemusicquiz.com/${audioFilename}`,
                { responseType: 'arraybuffer' }
            );

            fs.writeFileSync(tempPath, response.data);

            await new Promise((resolve, reject) => {
                ffmpeg(tempPath)
                    .setStartTime(song.trim_start)
                    .setDuration(this.settings.other.audioCut)
                    .audioBitrate('128k')
                    .audioChannels(2)
                    .audioFrequency(44100)
                    .output(finalPath)
                    .on('end', () => {
                        fs.unlinkSync(tempPath);
                        resolve();
                    })
                    .on('error', reject)
                    .run();
            });
        } catch (error) {
            logger.info(`Error downloading song`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
    }

    downloadImages = async (song) => {
        const posterPath = path.join(this.folder, 'Images', `${song.annId}_poster.jpg`);

        try {
            const response = await axios.get(song.poster.originalUrl, {
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
                }
            });

            await sharp(response.data)
                .resize({ width: 540, height: 760, fit: 'inside' })
                .jpeg({ quality: 80 })
                .toFile(posterPath);

            if (this.settings.other.images.include && song.images) {
                const collagePath = path.join(this.folder, 'Images', `${song.annId}.jpg`);
                const imageBuffers = [];

                for (const img of song.images) {
                    const imgResponse = await axios.get(img.originalUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
                        }
                    });
                    imageBuffers.push(imgResponse.data);
                }

                // Create collage
                const collageWidth = 800;
                const collageHeight = 600;
                const images = await Promise.all(
                    imageBuffers.map(buf => sharp(buf).resize(400, 300).toBuffer())
                );

                const collage = await sharp({
                    create: {
                        width: collageWidth,
                        height: collageHeight,
                        channels: 3,
                        background: { r: 0, g: 0, b: 0 }
                    }
                })
                    .composite([
                        { input: images[0], left: 0, top: 0 },
                        { input: images[1], left: 400, top: 0 },
                        { input: images[2], left: 0, top: 300 },
                        { input: images[3], left: 400, top: 300 }
                    ])
                    .jpeg({ quality: 80 })
                    .toFile(collagePath);
            }
        } catch (error) {
            logger.info(`Error downloading images`);
        }
    }
}

export default new Generator();