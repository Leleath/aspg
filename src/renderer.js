/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */


const $ = require('jquery');
window.jQuery = window.$ = $;

import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

const { Modal } = require('bootstrap');

let updateInfo = null;
function setupSlider() {
    const songsDifficultyMinSlider = $("#songsDifficultyMinSlider");
    const songsDifficultyMaxSlider = $("#songsDifficultyMaxSlider");
    const sliderRange = $("#slider-range");
    const minValue = $("#min-value");
    const maxValue = $("#max-value");
    const minGap = 0;

    function updateSlider() {
        let minVal = parseInt(songsDifficultyMinSlider.val());
        let maxVal = parseInt(songsDifficultyMaxSlider.val());

        if (maxVal - minVal < minGap) {
            if (this === songsDifficultyMinSlider) {
                songsDifficultyMinSlider.val(maxVal - minGap);
                minVal = maxVal - minGap;
            } else {
                songsDifficultyMaxSlider.val(minVal + minGap);
                maxVal = minVal + minGap;
            }
        }

        sliderRange.css("left", (minVal / 100) * 100 + "%")
        sliderRange.css("right", 100 - (maxVal / 100) * 100 + "%")

        minValue.text(minVal);
        maxValue.text(maxVal);
    }

    songsDifficultyMinSlider.on("input", updateSlider);
    songsDifficultyMaxSlider.on("input", updateSlider);

    updateSlider();
}
setupSlider();

function setupUserCard() {
    let userCardCount = 0;
    $('#addUserCardButton').on('click', function () {
        var userCardTemplate = $('#userCardTemplate').html();
        var $template = $(userCardTemplate);

        $template.attr('id', `userCard-${userCardCount}`);
        $template.find('.list-username').attr('id', `listUsername-${userCardCount}`);
        $template.find('.list-source').attr('id', `listSource-${userCardCount}`);
        $template.find('.check-plan-to-watch-checkbox').attr('id', `checkPlanToWatch-${userCardCount}`);
        $template.find('.check-plan-to-watch-label').attr('for', `checkPlanToWatch-${userCardCount}`);
        $template.find('.check-watching-checkbox').attr('id', `checkWatching-${userCardCount}`);
        $template.find('.check-watching-label').attr('for', `checkWatching-${userCardCount}`);
        $template.find('.check-completed-checkbox').attr('id', `checkCompleted-${userCardCount}`);
        $template.find('.check-completed-label').attr('for', `checkCompleted-${userCardCount}`);
        $template.find('.check-on-hold-checkbox').attr('id', `checkOnHold-${userCardCount}`);
        $template.find('.check-on-hold-label').attr('for', `checkOnHold-${userCardCount}`);
        $template.find('.check-dropped-checkbox').attr('id', `checkDropped-${userCardCount}`);
        $template.find('.check-dropped-label').attr('for', `checkDropped-${userCardCount}`);

        $template.find('.remove-card-button').on('click', function () {
            $(this).closest('.user-card').remove();
        });

        $('#listsCards').append($template);

        userCardCount = userCardCount + 1;
    })
}
setupUserCard();

function setupGenresCard() {
    let genreCardCount = 0;
    $('#addGenreCardButton').on('click', function () {
        var genreCardTemplate = $('#genreCardTemplate').html();
        var $template = $(genreCardTemplate);

        $template.attr('id', `userCard-${genreCardCount}`);
        $template.find('.genre-include').attr('id', `genreInclude-${genreCardCount}`);
        $template.find('.genre-name').attr('id', `genreName-${genreCardCount}`);

        $template.find('.remove-card-button').on('click', function () {
            $(this).closest('.genre-card').remove();
        });

        $('#genresCards').append($template);

        genreCardCount = genreCardCount + 1;
    })
}
setupGenresCard();

$("#checkRandomSwitch").on('click', function () {
    if ($(this).is(":checked")) {
        $('#userLists').addClass('hide');
    } else {
        $('#userLists').removeClass('hide');
    }
});

$('#openBuildsFolderButton').on('click', async function () {
    await window.electronAPI.openFolder();
})

$('#backToSettingsButton').on('click', async function () {
    $('#logMenu').addClass('hide');
    $('#logPage').addClass('hide');
    $('#settingsPage').removeClass('hide');
})

function validation(settings) {
    let validate = true;

    return validate;
}

function getSumQuestions() {
    const roundsCount = $('#packRoundsInput').val();
    const themesCount = $('#packThemesInput').val();
    const questionsCount = $('#packQuestionsInput').val();

    return parseInt(roundsCount) * parseInt(themesCount) * parseInt(questionsCount);
}
function getSumSongs() {
    const openingsCount = $('#packOpeningsInput').val();
    const endingsCount = $('#packEndingsInput').val();
    const insertsCount = $('#packInsertsInput').val();

    return parseInt(openingsCount) + parseInt(endingsCount) + parseInt(insertsCount);
}
function updateQuestionsLeft() {
    const questionsLeft = questionsCount - getSumSongs()

    $('#questionsLeft').html(questionsLeft);
}

let questionsCount = 90;
$('#packRoundsInput').on("change", function (e) {
    questionsCount = getSumQuestions();

    updateQuestionsLeft();
});
$('#packThemesInput').on("change", function (e) {
    questionsCount = getSumQuestions();
    updateQuestionsLeft();
});
$('#packQuestionsInput').on("change", function (e) {
    questionsCount = getSumQuestions();
    updateQuestionsLeft();
});

$('#packOpeningsInput').on("change", function (e) {
    updateQuestionsLeft();
});
$('#packEndingsInput').on("change", function (e) {
    updateQuestionsLeft();
});
$('#packInsertsInput').on("change", function (e) {
    updateQuestionsLeft();
});

$("#settingsForm").on("submit", async function (event) {
    event.preventDefault();

    const settings = {
        pack: {
            title: $('#packTitleInput').val() || 'Generated Songs Anime Pack',
            content: {
                rounds: parseInt($('#packRoundsInput').val()),
                themes: parseInt($('#packThemesInput').val()),
                questions: parseInt($('#packQuestionsInput').val()),
            },
            themeTitle: $('#packThemesTitleInput').val(),
        },
        lists: {
            random: $('#checkRandomSwitch').is(':checked'),
            users: $('.user-card').map((key, value) => {
                return {
                    username: $(value).find('.list-username').val(),
                    list: $(value).find('.list-source').val(),
                    status: {
                        ptw: $(value).find('.check-plan-to-watch-checkbox').is(':checked'),
                        watching: $(value).find('.check-watching-checkbox').is(':checked'),
                        completed: $(value).find('.check-completed-checkbox').is(':checked'),
                        onhold: $(value).find('.check-on-hold-checkbox').is(':checked'),
                        dropped: $(value).find('.check-dropped-checkbox').is(':checked')
                    }
                }
            }).get(),
            simillar: $('#simillarCheck').is(':checked'),
            simillarCount: parseInt($('#simillarCountInput').val())
        },
        songs: {
            rebroadcast: $('#songsRebroadcastCheckbox').is(':checked'),
            dub: $('#songsDubCheckbox').is(':checked'),
            types: {
                openings: parseInt($('#packOpeningsInput').val()),
                endings: parseInt($('#packEndingsInput').val()),
                inserts: parseInt($('#packInsertsInput').val()),
            },
            difficulty: {
                min: parseInt($('#songsDifficultyMinSlider').val()),
                max: parseInt($('#songsDifficultyMaxSlider').val())
            },
            category: {
                standard: $('#songCategoryStandardCheckbox').is(':checked'),
                instrumental: $('#songCategoryInstrumentalCheckbox').is(':checked'),
                chanting: $('#songCategoryChantingCheckbox').is(':checked'),
                character: $('#songCategoryCharacterCheckbox').is(':checked'),
            }
        },
        animes: {
            score: {
                from: parseInt($('#animeScoreFromInput').val()),
                to: parseInt($('#animeScoreToInput').val()),
            },
            kind: {
                tv: $('#statusTVCheck').is(':checked'),
                movie: $('#statusMovieCheck').is(':checked'),
                ova: $('#statusOVACheck').is(':checked'),
                ona: $('#statusONACheck').is(':checked'),
                special: $('#statusSpecialCheck').is(':checked')
            },
            vintage: {
                from: parseInt($('#animeVintageFromInput').val()),
                to: parseInt($('#animeVintageToInput').val())
            },
            genres: $('.genre-card').map((key, value) => {
                return {
                    name: $(value).find('.genre-name').val(),
                    include: $(value).find('.genre-include').is(':checked'),
                }
            }).get(),
            genresPartialMatch: $('#statusSpecialCheck').is(':checked')
        },
        other: {
            duplicateAnime: $('#animeDuplicateAnimeCheck').is(':checked'),
            duplicateFranchise: $('#animeDuplicateFranchiseCheck').is(':checked'),
            images: {
                include: $('#imagesCheck').is(':checked'),
                time: parseInt($('#imagesTimeInput').val())
            },
            hint: $('#hintCheck').is(':checked'),
            audioCut: parseInt($('#audioCut').val()),
            asyncDownload: $('#asyncDownloadCheck').is(':checked')
        }
    }

    console.log(settings)

    await window.electronAPI.generate(settings);
});
$('#generateButton').on('click', function (event) {
    event.preventDefault();

    $("#settingsForm").submit();
});

function generatorLog(data) {
    console.log(data)

    switch (data.type) {
        case 'log':
            $("#logTextarea").val($("#logTextarea").val() + data.message + '\n');
            $("#logTextarea").scrollTop($("#logTextarea")[0].scrollHeight);
            break;

        case 'startGenerator':
            $('#settingsPage').addClass('hide');
            $('#logPage').removeClass('hide');
            break;

        case 'endGenerator':
            $('#logMenu').removeClass('hide');
            break;

        default:
            break;
    }
}
window.electronAPI.generatorLog(generatorLog);

$('#openGithub').on('click', async function() {
    await window.electronAPI.openLink("https://github.com/Leleath/aspg/releases");
})

$('#openNewVersion').on('click', async function() {
    await window.electronAPI.openLink(updateInfo.downloadUrl);
})

function update(data) {
    $('#newUpdateModal').modal('show');

    updateInfo = data;

    $('#newVersion').text(`${data.oldVersion} -> ${data.newVersion}`);
}
window.electronAPI.responseUpdate(update);

async function getUpdate() {
    await window.electronAPI.getUpdate();
}
getUpdate();