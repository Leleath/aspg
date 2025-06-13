// const path = require('path');
// const fs = require('fs');
// const axios = require('axios');
// const ffmpeg = require('fluent-ffmpeg');
// const sharp = require('sharp');
// const { v4: uuidv4 } = require('uuid');
// const AdmZip = require('adm-zip');

// import { path } from 'path';
// import { fs } from 'fs';
// import axios from 'axios';
// import ffmpeg from 'fluent-ffmpeg';
// import sharp from 'sharp';
// import uuidv4 from 'fuuids';
// import AdmZip from 'adm-zip';

// const BUILDS_PATH = path.join(__dirname, 'builds');

// [BUILDS_PATH].forEach(dir => {
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
// });

// async function getAmqIds() {
//     // log('Loading anime from AMQ');

//     const response = await axios.get(
//         'https://animemusicquiz.com/libraryMasterList',
//         { headers: { 'Origin': 'https://developer.mozilla.org' } }
//     );
//     return Object.keys(response.data.animeMap);
// }

// async function getMalIds() {
//     // log('Loading anime from MyAnimeList');

//     const users = settings.malName.split(',');
//     const animeMap = {};

//     for (const user of users) {
//         // log(`User: ${user}`);
//         let offset = 0;

//         while (true) {
//             // log(`Cycle: ${offset} - ${offset + 300} / Total anime: ${Object.keys(animeMap).length}`);

//             try {
//                 const response = await axios.get(
//                     `https://myanimelist.net/animelist/${user}/load.json?offset=${offset}&status=7`
//                 );

//                 const responseAnimes = response.data;
//                 if (!responseAnimes.length) {
//                     // log(`User: ${user}. No more anime, moving on`);
//                     break;
//                 }

//                 for (const anime of responseAnimes) {
//                     if (!anime.status) continue;

//                     const listType = {
//                         1: 'watching',
//                         2: 'completed',
//                         3: 'onhold',
//                         4: 'dropped',
//                         6: 'ptw'
//                     }[anime.status];

//                     if (!settings.lists[listType]) continue;

//                     if (anime.anime_id in animeMap) {
//                         animeMap[anime.anime_id].push(user);
//                     } else {
//                         animeMap[anime.anime_id] = [user];
//                     }
//                 }

//                 offset += 300;
//             } catch (error) {
//                 // log(`Error fetching MAL data: ${error.message}`);
//                 break;
//             }
//         }
//     }

//     if (settings.simillar) {
//         for (const [id, users] of Object.entries(animeMap)) {
//             if (users.length <= 1) delete animeMap[id];
//         }
//     }

//     // log(`All anime loaded from MyAnimeList / Total anime: ${Object.keys(animeMap).length}`);
//     return animeMap;
// }

// function filterSongs(song) {
//     const artistsList = settings.artists_list ? settings.artists_list.split(',') : [];

//     // Year check
//     const year = parseInt(song.animeVintage.split(' ')[1]);
//     if (!(settings.vintage.start <= year && year <= settings.vintage.end)) {
//         return false;
//     }

//     // Artist check
//     if (artistsList.length && !isArtistInSong(song, artistsList)) {
//         return false;
//     }

//     if (!song.audio || !song.songDifficulty || !song.songLength || !song.animeType) {
//         return false;
//     }

//     // Anime type check
//     if (!settings.random && !settings.animeTypes[song.animeType.toLowerCase()]) {
//         return false;
//     }

//     if (!settings.songCategory[song.songCategory.toLowerCase()]) {
//         return false;
//     }

//     // Basic song checks
//     const checks = [
//         !(song.isDub === 1 && !settings.dub),
//         !(song.isRebroadcast === 1 && !settings.rebroadcast),
//         settings.difficulty.min <= song.songDifficulty && song.songDifficulty <= settings.difficulty.max
//     ];

//     if (!checks.every(Boolean)) {
//         return false;
//     }

//     // Song type check
//     const songType = song.songType.split(' ')[0];
//     const typeChecks = {
//         'Opening': settings.openings.include,
//         'Ending': settings.endings.include,
//         'Insert': settings.inserts.include
//     };

//     return typeChecks[songType] || false;
// }

// async function getSongs(animesIds) {
//     if (settings.local_anisong_db && fs.existsSync(ANISONG_DB)) {
//         log('Getting songs from local Anisong JSON');
//         const songs = JSON.parse(fs.readFileSync(ANISONG_DB)).songs;

//         if (settings.random) {
//             return songs.filter(song =>
//                 animesIds.includes(String(song.annId)) &&
//                 filterSongs(song)
//             );
//         }

//         return songs.filter(song =>
//             animesIds.includes(song.linked_ids.myanimelist) &&
//             filterSongs(song)
//         );
//     }

//     log('Getting songs from Anisong');
//     const songsMap = [];

//     for (let i = 0; i < animesIds.length; i += 300) {
//         log(`Cycle: ${i} - ${i + 300} / Total songs: ${songsMap.length}`);

//         const batch = animesIds.slice(i, i + 300);
//         let response;

//         if (settings.random) {
//             response = await axios.post(
//                 'https://anisongdb.com/api/annIdList_request',
//                 { annIds: batch }
//             );
//         } else {
//             response = await axios.post(
//                 'https://anisongdb.com/api/malIDs_request',
//                 { malIds: batch }
//             );
//         }

//         songsMap.push(...response.data.filter(song => filterSongs(song)));
//     }

//     return songsMap;
// }

// function processSongs(songsMap, animeMap = null) {
//     log('Shuffling songs');
//     for (let i = 0; i < 10; i++) {
//         songsMap.sort(() => Math.random() - 0.5);
//     }

//     log('Removing duplicate annIds');
//     const uniqueSongs = [];
//     const seenIds = new Set();

//     for (const song of songsMap) {
//         if (!seenIds.has(song.annId)) {
//             seenIds.add(song.annId);
//             uniqueSongs.push(song);
//         }
//     }

//     log(`Total songs: ${uniqueSongs.length}`);

//     log('Selecting songs from anime');
//     const selectedSongs = [];
//     const shikimoriFranchises = [];
//     const anisongFranchises = [];

//     const allGenres = settings.genres_list ? settings.genres_list.split(',') : [];
//     const allOrigins = settings.origins_list ? settings.origins_list.split(',') : [];

//     if (settings.local_shikimori_db && fs.existsSync(SHIKIMORI_DB)) {
//         log('Getting songs from local Shikimori JSON');
//         const shikimoriData = JSON.parse(fs.readFileSync(SHIKIMORI_DB)).animes;

//         for (const song of uniqueSongs) {
//             try {
//                 const anime = shikimoriData.find(item => item.malId === String(song.linked_ids.myanimelist));
//                 if (!anime) continue;

//                 if (!settings.duplicate_franchises && shikimoriFranchises.includes(anime.franchise)) {
//                     continue;
//                 }

//                 if (!(settings.min_rating <= anime.score && anime.score <= settings.max_rating)) {
//                     continue;
//                 }

//                 song.russian = anime.russian;
//                 song.poster = anime.poster.originalUrl;

//                 if (allGenres.length && !anime.genres.some(g => allGenres.includes(g.name))) {
//                     continue;
//                 }

//                 if (allOrigins.length && !allOrigins.includes(anime.origin)) {
//                     continue;
//                 }

//                 if (settings.images && anime.screenshots && anime.screenshots.length > 4) {
//                     song.images = anime.screenshots
//                         .map((img, i) => ({ index: i, src: img.originalUrl }))
//                         .sort(() => Math.random() - 0.5)
//                         .slice(0, 4);
//                 } else if (settings.images) {
//                     continue;
//                 }

//                 if (!settings.duplicate_franchises) {
//                     shikimoriFranchises.push(anime.franchise);
//                 }

//                 if (selectedSongs.filter(x => x.annSongId === song.annSongId).length > 1) {
//                     continue;
//                 }

//                 const songType = song.songType.split(' ')[0];
//                 const typeCounts = {
//                     'Opening': selectedSongs.filter(x => x.songType.split(' ')[0] === 'Opening').length,
//                     'Ending': selectedSongs.filter(x => x.songType.split(' ')[0] === 'Ending').length,
//                     'Insert': selectedSongs.filter(x => x.songType.split(' ')[0] === 'Insert').length
//                 };

//                 if (typeCounts[songType] >= settings[`${songType.toLowerCase()}s`].count) {
//                     continue;
//                 }

//                 if (!settings.duplicate_shows && anisongFranchises.includes(song.annId)) {
//                     continue;
//                 }

//                 if (!settings.duplicate_shows) {
//                     anisongFranchises.push(song.annId);
//                 }

//                 selectedSongs.push(song);
//             } catch (error) {
//                 log(`Error processing song: ${error.message}`);
//                 continue;
//             }
//         }
//     } else {
//         // Similar logic for non-local Shikimori data
//         // Would implement similar to Python version but with async/await
//     }

//     return selectedSongs;
// }

// async function createPackage(songsMap, animeMap = null) {
//     log('Creating package');
//     const packSongs = [];
//     let currentId = 0;
//     const sigameFileName = uuidv4();
//     const folder = path.join(__dirname, 'temp');
//     const subdirs = ['Images', 'Audio', 'Video'];

//     // Clean and create directories
//     if (fs.existsSync(folder)) {
//         fs.rmSync(folder, { recursive: true });
//     }
//     fs.mkdirSync(folder);
//     subdirs.forEach(subdir => fs.mkdirSync(path.join(folder, subdir)));
//     if (!fs.existsSync(BUILDS_PATH)) fs.mkdirSync(BUILDS_PATH);
//     fs.mkdirSync(path.join(BUILDS_PATH, `build_${sigameFileName}`));

//     // Create XML structure
//     const { Builder } = require('xml2js');
//     const builder = new Builder();
//     const packageObj = {
//         package: {
//             $: {
//                 name: 'Anime',
//                 version: '5',
//                 id: '69831e55-f450-4fdf-8200-ee18d9d8d413',
//                 xmlns: 'https://github.com/VladimirKhil/SI/blob/master/assets/siq_5.xsd'
//             },
//             tags: [{ tag: ['Аниме'] }],
//             info: {
//                 authors: [{ author: ['Generator'] }]
//             },
//             rounds: {
//                 round: []
//             }
//         }
//     };

//     // Fill rounds, themes and questions
//     for (let tempRounds = 0; tempRounds < settings.rounds; tempRounds++) {
//         if (currentId >= songsMap.length) break;

//         const round = {
//             $: { name: `round ${tempRounds + 1}` },
//             themes: {
//                 theme: []
//             }
//         };

//         for (let tempThemes = 0; tempThemes < settings.themes; tempThemes++) {
//             if (currentId >= songsMap.length) break;

//             const theme = {
//                 $: { name: '' },
//                 questions: {
//                     question: []
//                 }
//             };

//             let price = 0;
//             for (let tempQuestions = 0; tempQuestions < settings.questions; tempQuestions++) {
//                 if (currentId >= songsMap.length) break;

//                 const song = songsMap[currentId];
//                 if (settings.equal) {
//                     price += 2;
//                 } else {
//                     const getPrice = (difficulty) => {
//                         const priceRanges = [
//                             [90, 2],
//                             [80, 4],
//                             [70, 6],
//                             [60, 8],
//                             [50, 10],
//                             [40, 12],
//                             [30, 14],
//                             [20, 16],
//                             [10, 18],
//                             [0, 20]
//                         ];

//                         for (const [threshold, p] of priceRanges) {
//                             if (difficulty >= threshold) return p;
//                         }
//                         return 1;
//                     };

//                     price = getPrice(song.songDifficulty);
//                 }

//                 const question = {
//                     $: { price: price.toString() },
//                     params: {
//                         param: [
//                             {
//                                 $: { name: 'question', type: 'content' },
//                                 item: [
//                                     {
//                                         $: {
//                                             type: 'audio',
//                                             isRef: 'True',
//                                             placement: 'background',
//                                             duration: `00:00:${settings.cut_audio - 7}`
//                                         },
//                                         _: song.audio
//                                     }
//                                 ]
//                             },
//                             {
//                                 $: { name: 'answer', type: 'content' },
//                                 item: []
//                             }
//                         ]
//                     },
//                     right: {
//                         answer: [
//                             `${song.russian} - ${song.animeJPName} (${song.animeCategory}) - ` +
//                             `(${song.songType}) - (${Math.floor(song.songDifficulty)}) - ` +
//                             `(${song.songArtist} - ${song.songName})` +
//                             (settings.random ? '' : ` - (${song.users.join(', ')})`)
//                         ]
//                     }
//                 };

//                 if (settings.images) {
//                     question.params.param[0].item.push({
//                         $: {
//                             type: 'image',
//                             isRef: 'True',
//                             duration: '00:00:01'
//                         },
//                         _: `${song.annId}.jpg`
//                     });
//                 }

//                 if (!settings.random) {
//                     question.params.param[1].item.push({
//                         $: {
//                             waitForFinish: 'False',
//                             placement: 'replic'
//                         },
//                         _: song.users.join(', ')
//                     });
//                 }

//                 if (settings.video && song.video) {
//                     question.params.param[1].item.push({
//                         $: {
//                             type: 'video',
//                             isRef: 'True',
//                             waitForFinish: 'False',
//                             duration: '00:00:03'
//                         },
//                         _: `${song.video.split('.')[0]}.mp4`
//                     });
//                 } else {
//                     question.params.param[1].item.push({
//                         $: {
//                             type: 'image',
//                             isRef: 'True',
//                             waitForFinish: 'False',
//                             duration: '00:00:03'
//                         },
//                         _: `${song.annId}_poster.jpg`
//                     });
//                 }

//                 question.params.param[1].item.push({
//                     _: `${song.russian} ${song.songType}`
//                 });

//                 theme.questions.question.push(question);
//                 packSongs.push(song);
//                 currentId++;
//             }

//             round.themes.theme.push(theme);
//         }

//         packageObj.package.rounds.round.push(round);
//     }

//     // Save XML
//     const xml = builder.buildObject(packageObj);
//     fs.writeFileSync(path.join(folder, 'content.xml'), xml);

//     // Download media files
//     await processMediaDownloads(packSongs, folder);

//     // Create archive
//     log('Saving package');
//     const zip = new AdmZip();
//     zip.addLocalFolder(folder);
//     zip.writeZip(path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.zip'));

//     fs.rmSync(folder, { recursive: true });
//     fs.renameSync(
//         path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.zip'),
//         path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.siq')
//     );

//     log('Package generation completed');
// }

// async function processMediaDownloads(packSongs, folder) {
//     const downloadPromises = [];

//     for (const song of packSongs) {
//         downloadPromises.push(
//             downloadSong(song, folder),
//             downloadImages(song, folder)
//         );

//         if (settings.video && song.video) {
//             downloadPromises.push(downloadVideo(song, folder));
//         }
//     }

//     let completed = 0;
//     const total = downloadPromises.length;

//     for (const promise of downloadPromises) {
//         await promise;
//         completed++;
//         log(`Download progress: ${completed}/${total}`);
//     }
// }

// async function downloadVideo(songData, folder) {
//     if (!songData.video) return;

//     const videoFilename = songData.video;
//     const finalPath = path.join(folder, 'Video', `${videoFilename.split('.')[0]}.mp4`);

//     return new Promise((resolve, reject) => {
//         ffmpeg(`https://naedist.animemusicquiz.com/${videoFilename}`)
//             .setStartTime(songData.trim_start)
//             .setDuration(4)
//             .videoCodec('libx264')
//             .audioCodec('aac')
//             .outputOptions([
//                 '-preset fast',
//                 '-crf 23',
//                 '-avoid_negative_ts make_zero',
//                 '-movflags faststart'
//             ])
//             .output(finalPath)
//             .on('end', resolve)
//             .on('error', reject)
//             .run();
//     });
// }

// async function downloadSong(songData, folder) {
//     if (!songData.audio) return;

//     const audioFilename = songData.audio;
//     const finalPath = path.join(folder, 'Audio', audioFilename);
//     const tempPath = path.join(folder, 'Audio', `temp_${audioFilename}`);

//     try {
//         const response = await axios.get(
//             `https://naedist.animemusicquiz.com/${audioFilename}`,
//             { responseType: 'arraybuffer' }
//         );

//         fs.writeFileSync(tempPath, response.data);

//         await new Promise((resolve, reject) => {
//             ffmpeg(tempPath)
//                 .setStartTime(songData.trim_start)
//                 .setDuration(songData.trim_end - songData.trim_start)
//                 .audioBitrate('128k')
//                 .audioChannels(2)
//                 .audioFrequency(44100)
//                 .output(finalPath)
//                 .on('end', () => {
//                     fs.unlinkSync(tempPath);
//                     resolve();
//                 })
//                 .on('error', reject)
//                 .run();
//         });
//     } catch (error) {
//         log(`Error downloading song: ${error.message}`);
//         if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
//         throw error;
//     }
// }

// async function downloadImages(song, folder) {
//     const posterPath = path.join(folder, 'Images', `${song.annId}_poster.jpg`);

//     try {
//         const response = await axios.get(song.poster, {
//             responseType: 'arraybuffer',
//             headers: {
//                 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
//             }
//         });

//         await sharp(response.data)
//             .resize({ width: 540, height: 760, fit: 'inside' })
//             .jpeg({ quality: 80 })
//             .toFile(posterPath);

//         if (settings.images && song.images) {
//             const collagePath = path.join(folder, 'Images', `${song.annId}.jpg`);
//             const imageBuffers = [];

//             for (const img of song.images.slice(0, 4)) {
//                 const imgResponse = await axios.get(img.src, {
//                     responseType: 'arraybuffer',
//                     headers: {
//                         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
//                     }
//                 });
//                 imageBuffers.push(imgResponse.data);
//             }

//             // Create collage
//             const collageWidth = 800;
//             const collageHeight = 600;
//             const images = await Promise.all(
//                 imageBuffers.map(buf => sharp(buf).resize(400, 300).toBuffer())
//             );

//             const collage = await sharp({
//                 create: {
//                     width: collageWidth,
//                     height: collageHeight,
//                     channels: 3,
//                     background: { r: 0, g: 0, b: 0 }
//                 }
//             })
//                 .composite([
//                     { input: images[0], left: 0, top: 0 },
//                     { input: images[1], left: 400, top: 0 },
//                     { input: images[2], left: 0, top: 300 },
//                     { input: images[3], left: 400, top: 300 }
//                 ])
//                 .jpeg({ quality: 80 })
//                 .toFile(collagePath);
//         }
//     } catch (error) {
//         log(`Error downloading images: ${error.message}`);
//         throw error;
//     }
// }

// async function run() {
//     log('Starting package generation');

//     let selectedSongs = [];

//     if (settings.local_file && fs.existsSync(settings.local_file)) {
//         try {
//             const animesData = JSON.parse(fs.readFileSync(settings.local_file, 'utf-8'));

//             if (settings.local_shikimori_db && fs.existsSync(SHIKIMORI_DB)) {
//                 log('Getting songs from local Shikimori JSON');
//                 const shikimoriData = JSON.parse(fs.readFileSync(SHIKIMORI_DB)).animes;

//                 for (const song of animesData) {
//                     try {
//                         const anime = shikimoriData.find(
//                             item => item.malId === String(song.linked_ids.myanimelist)
//                         );
//                         if (!anime) continue;

//                         song.russian = anime.russian;
//                         song.poster = anime.poster.originalUrl;

//                         if (settings.images && anime.screenshots && anime.screenshots.length > 4) {
//                             song.images = anime.screenshots
//                                 .map((img, i) => ({ index: i, src: img.originalUrl }))
//                                 .sort(() => Math.random() - 0.5)
//                                 .slice(0, 4);
//                         } else if (settings.images) {
//                             continue;
//                         }

//                         selectedSongs.push(song);
//                     } catch (error) {
//                         log(`Error processing local song: ${error.message}`);
//                         continue;
//                     }
//                 }
//             } else {
//                 // Similar logic for non-local Shikimori data
//                 // Would implement similar to Python version but with async/await
//             }

//             log('Shuffling songs');
//             for (let i = 0; i < 10; i++) {
//                 selectedSongs.sort(() => Math.random() - 0.5);
//             }

//             log(`Songs selected / Total songs: ${selectedSongs.length}`);
//         } catch (error) {
//             log(`Error processing local file: ${error.message}`);
//             throw error;
//         }
//     } else {
//         // Get anime IDs
//         let animeIds;
//         let animeUsers = {};

//         if (!settings.random) {
//             animeUsers = await getMalIds();
//             animeIds = Object.keys(animeUsers);
//         } else {
//             animeIds = await getAmqIds();
//         }

//         // Get and filter songs
//         const songsMap = await getSongs(animeIds);
//         log(`Songs loaded / Total songs: ${songsMap.length}`);

//         // Process songs
//         selectedSongs = processSongs(songsMap);
//         log(`Songs selected / Total songs: ${selectedSongs.length}`);
//     }

//     // Add timestamps
//     for (const song of selectedSongs) {
//         const maxStart = Math.max(0, parseInt(song.songLength) - settings.cut_audio - 1);
//         song.trim_start = Math.floor(Math.random() * maxStart);
//         song.trim_end = song.trim_start + settings.cut_audio;

//         if (!settings.random) {
//             for (const [key, value] of Object.entries(animeUsers)) {
//                 if (song.linked_ids.myanimelist === key) {
//                     song.users = value;
//                     break;
//                 }
//             }
//         }
//     }

//     // Distribute songs by difficulty if needed
//     if (settings.equal) {
//         selectedSongs = selectedSongs.slice(
//             0,
//             settings.rounds * settings.themes * settings.questions
//         );

//         selectedSongs.sort((a, b) => b.songDifficulty - a.songDifficulty);

//         // Would implement similar 2D array reshaping as in Python version
//     }

//     // Create package
//     await createPackage(selectedSongs);
// }

const axios = require('axios');
const { Builder } = require('xml2js');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const AdmZip = require('adm-zip');
const { app, shell } = require('electron');
import sharp from 'sharp';

export default class Generator {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.settings = null;
        this.usersAnimesMap = {};
        this.folder = null;
    }

    log(message) {
        console.log(message)

        this.mainWindow.webContents.send('generatorLog', {
            type: 'log',
            message: message
        });
    }

    async getAMQIds() {
        this.log('Getting Animes from AMQ');

        const response = await axios.get(
            'https://animemusicquiz.com/libraryMasterList',
            { headers: { 'Origin': 'https://developer.mozilla.org' } }
        );

        const animeMap = Object.keys(response.data.animeMap)

        this.log('Animes from AMQ successfully Received');

        return this.shuffle(animeMap);
    }

    shuffle(arrayData) {
        let tempArrayData = arrayData;

        for (var j = 0; j < 10; j++) {
            for (var i = 0; i < tempArrayData.length - 1; i++) {
                var ni = Math.floor(Math.random() * (i + 1));
                var temp = tempArrayData[i];
                tempArrayData[i] = tempArrayData[ni];
                tempArrayData[ni] = temp;
            }
        }

        return tempArrayData;
    }

    async getMalIds(user) {
        this.log('Loading anime from MyAnimeList');

        let animesIds = [];

        let offset = 0;
        while (true) {
            this.log(`Cycle: ${offset} - ${offset + 300} / Total anime: ${animesIds.length}`);

            try {
                const response = await axios.get(
                    `https://myanimelist.net/animelist/${user.username}/load.json?offset=${offset}&status=7`
                );

                const responseAnimes = response.data;
                if (!responseAnimes.length) {
                    this.log(`User: ${user}. No more anime, moving on`);

                    break;
                }

                for (const anime of responseAnimes) {
                    if (!anime.status) continue;

                    const listType = {
                        1: 'watching',
                        2: 'completed',
                        3: 'onhold',
                        4: 'dropped',
                        6: 'ptw'
                    }[anime.status];

                    if (!user.status[listType]) continue;

                    animesIds.push(anime.anime_id)
                }

                offset += 300;
            } catch (error) {
                this.log(`Error fetching MAL data: ${error.message}`);
                break;
            }
        }

        this.log(`All anime loaded from MyAnimeList / Total anime: ${animesIds.length}`);

        return animesIds;
    }

    async getShikimoriIds(user) {
        this.log('Loading anime from Shikimori');

        let animesIds = [];

        try {
            const responseShikimoriId = await axios.get(
                `https://shikimori.one/api/users?search="${user.username}"`
            );
            const responseShikimoriUserId = responseShikimoriId.data[0].id;

            const response = await axios.get(
                `https://shikimori.one/api/v2/user_rates?user_id=${responseShikimoriUserId}`
            );

            const responseAnimes = response.data;

            for (const anime of responseAnimes) {
                if (!anime.status || !(anime.target_type == 'Anime')) continue;

                const listType = {
                    'watching': 'watching',
                    'completed': 'completed',
                    'on_hold': 'onhold',
                    'dropped': 'dropped',
                    'planned': 'ptw'
                }[anime.status];

                if (!user.status[listType]) continue;

                animesIds.push(anime.target_id)
            }
        } catch (error) {
            this.log(`Error fetching MAL data: ${error.message}`);
        }

        this.log(`All anime loaded from Shikimori / Total anime: ${animesIds.length}`);

        return animesIds;
    }

    filterSongs(song) {
        if (![
            song.audio,
            song.songDifficulty,
            song.songLength,
            song.animeType,
            song.linked_ids,
            song.linked_ids.myanimelist,
            // (!settings.random && !settings.animeTypes[song.animeType.toLowerCase()]),
            // (!settings.songCategory[song.songCategory.toLowerCase()]),
            // !(song.isDub === 1 && !settings.dub),
            !(this.settings.songs.difficulty.min >= song.songDifficulty && song.songDifficulty <= this.settings.songs.difficulty.max),
            // !(settings.vintage.start <= year && year <= settings.vintage.end)
        ].every(Boolean)) return false;

        return true;
    }

    async getSongs(animesIds) {
        this.log('Getting songs from Anisong');

        const franchises = [];

        const songsMap = {
            openings: [],
            endings: [],
            inserts: [],
        };

        for (let i = 0; i < animesIds.length; i += 300) {
            if (
                (songsMap.openings.length >= this.settings.songs.types.openings) &&
                (songsMap.endings.length >= this.settings.songs.types.endings) &&
                (songsMap.inserts.length >= this.settings.songs.types.inserts)
            ) break;

            this.log(`Cycle: ${i} - ${i + 300} / Total songs: ${songsMap.openings.length + songsMap.endings.length + songsMap.inserts.length}`);

            const batch = animesIds.slice(i, i + 300);
            let response;

            if (this.settings.lists.random) {
                response = await axios.post(
                    'https://anisongdb.com/api/annIdList_request',
                    { annIds: batch }
                );
            } else {
                response = await axios.post(
                    'https://anisongdb.com/api/malIDs_request',
                    { malIds: batch }
                );
            }

            const tempSongs = this.shuffle(response.data.filter(song => this.filterSongs(song)));
            const tempAnimes = this.shuffle([...new Set(tempSongs.map(song => song.linked_ids.myanimelist))]);

            for (let i = 0; i < tempAnimes.length; i += 50) {
                if (
                    (songsMap.openings.length >= this.settings.songs.types.openings) &&
                    (songsMap.endings.length >= this.settings.songs.types.endings) &&
                    (songsMap.inserts.length >= this.settings.songs.types.inserts)
                ) break;

                const animeIds = tempAnimes.slice(i, i + 50).map(k => k.toString());

                const query = `
                    {
                        animes(ids: "${animeIds.join(',')}", limit: 50) {
                            id malId name russian franchise score origin rating kind
                            genres { id name russian kind }
                            poster { id originalUrl mainUrl }
                            screenshots { id originalUrl x166Url x332Url }
                        }
                    }
                `;

                try {
                    const response = await axios.post('https://shikimori.one/api/graphql',
                        { query },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.93 Safari/537.36'
                            }
                        }
                    );

                    const shikimoriAnimes = response.data.data.animes

                    tempSongs.forEach(song => {
                        if (
                            (songsMap.openings.length >= this.settings.songs.types.openings) &&
                            (songsMap.endings.length >= this.settings.songs.types.endings) &&
                            (songsMap.inserts.length >= this.settings.songs.types.inserts)
                        ) return;

                        const shikimoriAnime = shikimoriAnimes.find(anime => anime.malId == song.linked_ids.myanimelist);
                        if (!shikimoriAnime || !shikimoriAnime.poster || shikimoriAnime.screenshots.length <= 4 || franchises.includes(shikimoriAnime.franchise)) return;

                        song.russian = shikimoriAnime.russian || '';
                        song.poster = shikimoriAnime.poster;
                        song.images = (this.shuffle(shikimoriAnime.screenshots)).slice(0, 4);

                        switch (song.songType.split(' ')[0]) {
                            case 'Opening': if (songsMap.openings.length < this.settings.songs.types.openings) songsMap.openings.push(song); break;
                            case 'Ending': if (songsMap.endings.length < this.settings.songs.types.endings) songsMap.endings.push(song); break;
                            case 'Insert': if (songsMap.inserts.length < this.settings.songs.types.inserts) songsMap.inserts.push(song); break;
                        }

                        franchises.push(shikimoriAnime.franchise)
                    });

                } catch (error) {
                    console.error('Error fetching anime data:', error);
                    return null;
                }
            }
        }

        const songsArray = [...songsMap.openings, ...songsMap.endings, ...songsMap.inserts];

        this.log('Songs from Anisong successfully Received');

        return this.shuffle(songsArray);
    }

    async getUsersLists() {
        const users = this.settings.lists.users;

        this.log('get users', users)

        this.usersAnimesMap = {};
        let animesIds = [];

        for (const user of users) {
            this.log(`User: ${user.username}`);

            switch (user.list) {
                case 'myanimelist':
                    this.usersAnimesMap[`${user.username}`] = await this.getMalIds(user);
                    animesIds = animesIds.concat(this.usersAnimesMap[`${user.username}`]);
                    break;
                case 'shikimori':
                    this.usersAnimesMap[`${user.username}`] = await this.getShikimoriIds(user);
                    animesIds = animesIds.concat(this.usersAnimesMap[`${user.username}`]);
                    break;
                // case 'anilist':
                //     console.log('anilist')
                //     break;
            }
        }

        // if (settings.simillar) {
        //     for (const [id, users] of Object.entries(animeMap)) {
        //         if (users.length <= 1) delete animeMap[id];
        //     }
        // }

        return [...new Set(animesIds)];
    }

    async createPackage(songsMap) {
        this.log('Creating package');

        const packSongs = [];
        const sigameFileName = uuidv4();
        const userDataPath = app.getPath('userData');
        const folder = path.join(userDataPath, 'temp');
        const subdirs = ['Images', 'Audio'];
        const BUILDS_PATH = path.join(userDataPath, 'builds');

        if (fs.existsSync(folder)) {
            fs.rmSync(folder, { recursive: true });
        }
        fs.mkdirSync(folder);
        subdirs.forEach(subdir => fs.mkdirSync(path.join(folder, subdir)));
        if (!fs.existsSync(BUILDS_PATH)) fs.mkdirSync(BUILDS_PATH);
        fs.mkdirSync(path.join(BUILDS_PATH, `build_${sigameFileName}`));

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
                    $: { name: '' },
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
                                                // duration: `00:00:${settings.cut_audio - 7}`
                                                duration: `00:00:07`
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
                                // + (settings.random ? '' : ` - (${song.users.join(', ')})`)
                            ]
                        }
                    };

                    if (this.settings.animes.images) {
                        question.params.param[0].item.push({
                            $: {
                                type: 'image',
                                isRef: 'True',
                                duration: '00:00:01'
                            },
                            _: `${song.annId}.jpg`
                        });
                    }

                    // if (!settings.random) {
                    //     question.params.param[1].item.push({
                    //         $: {
                    //             waitForFinish: 'False',
                    //             placement: 'replic'
                    //         },
                    //         _: song.users.join(', ')
                    //     });
                    // }

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
        fs.writeFileSync(path.join(folder, 'content.xml'), xml);

        await this.processMediaDownloads(packSongs, folder);

        this.log('Saving package');
        const zip = new AdmZip();
        zip.addLocalFolder(folder);
        zip.writeZip(path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.zip'));

        fs.rmSync(folder, { recursive: true });
        fs.renameSync(
            path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.zip'),
            path.join(BUILDS_PATH, `build_${sigameFileName}`, 'sigame.siq')
        );

        this.log('Package generation completed');

        return folder;
    }

    async processMediaDownloads(packSongs, folder) {
        const downloadPromises = [];

        for (const song of packSongs) {
            downloadPromises.push(
                this.downloadSong(song, folder),
                this.downloadImages(song, folder)
            );
        }

        let completed = 0;
        const total = downloadPromises.length;

        for (const promise of downloadPromises) {
            await promise;
            completed++;
            this.log(`Download progress: ${completed}/${total}`);
        }
    }

    async downloadSong(song, folder) {
        if (!song.audio) return;

        song.trim_start = 0;
        song.trim_end = 8;

        const audioFilename = song.audio;
        const finalPath = path.join(folder, 'Audio', audioFilename);
        const tempPath = path.join(folder, 'Audio', `temp_${audioFilename}`);

        try {
            const response = await axios.get(
                `https://naedist.animemusicquiz.com/${audioFilename}`,
                { responseType: 'arraybuffer' }
            );

            fs.writeFileSync(tempPath, response.data);

            await new Promise((resolve, reject) => {
                ffmpeg(tempPath)
                    .setStartTime(song.trim_start)
                    .setDuration(song.trim_end)
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
            this.log(`Error downloading song`);
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            throw error;
        }
    }

    async downloadImages(song, folder) {
        const posterPath = path.join(folder, 'Images', `${song.annId}_poster.jpg`);

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

            if (this.settings.animes.images && song.images) {
                const collagePath = path.join(folder, 'Images', `${song.annId}.jpg`);
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
            this.log(`Error downloading images: ${error.message}`);
            throw error;
        }
    }

    openFolder() {
        shell.showItemInFolder(this.folder);
    }

    async gen(settings) {
        this.settings = settings;

        this.mainWindow.webContents.send('generatorLog', {
            type: 'startGenerator'
        });

        this.log('Start Generation')

        const animesIds = this.settings.lists.random ? await this.getAMQIds() : await this.getUsersLists();
        const songs = await this.getSongs(animesIds);
        this.folder = await this.createPackage(songs);

        this.log('Generation Success');
    }
}