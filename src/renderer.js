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


import $ from 'jquery';
window.$ = $;
window.jQuery = $;

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '@fortawesome/fontawesome-free/css/all.min.css';

$(() => {
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

    let userCardCount = 0;
    $('#addListButton').on('click', function () {
        var userCardTemplate = $('#userCardTemplate').html();
        var $template = $(userCardTemplate);

        $template.attr('id', `userCard-${userCardCount}`);
        $template.find('.list-username').attr('id', `listUsername-${userCardCount}`);
        $template.find('.list-source').attr('id', `listSource-${userCardCount}`);
        $template.find('.check-plan-to-watch-input').attr('id', `checkPlanToWatch-${userCardCount}`);
        $template.find('.check-plan-to-watch-label').attr('for', `checkPlanToWatch-${userCardCount}`);
        $template.find('.check-watching-input').attr('id', `checkWatching-${userCardCount}`);
        $template.find('.check-watching-label').attr('for', `checkWatching-${userCardCount}`);
        $template.find('.check-completed-input').attr('id', `checkCompleted-${userCardCount}`);
        $template.find('.check-completed-label').attr('for', `checkCompleted-${userCardCount}`);
        $template.find('.check-on-hold-input').attr('id', `checkOnHold-${userCardCount}`);
        $template.find('.check-on-hold-label').attr('for', `checkOnHold-${userCardCount}`);
        $template.find('.check-dropped-input').attr('id', `checkDropped-${userCardCount}`);
        $template.find('.check-dropped-label').attr('for', `checkDropped-${userCardCount}`);

        $template.find('.remove-list-button').on('click', function () {
            $(this).closest('.user-card').remove();
        });

        $('#listsCards').append($template);

        userCardCount = userCardCount + 1;
    })
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
        $('#logPage').addClass('hide');
        $('#settingsPage').removeClass('hide');
    })

    function generatorLog(data) {
        console.log(data.type)
        switch (data.type) {
            case 'log':
                $("#logTextarea").val($("#logTextarea").val() + data.message + '\n');
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
                            ptw: $(value).find('.check-plan-to-watch-input').is(':checked'),
                            watching: $(value).find('.check-watching-input').is(':checked'),
                            completed: $(value).find('.check-completed-input').is(':checked'),
                            onhold: $(value).find('.check-on-hold-input').is(':checked'),
                            dropped: $(value).find('.check-dropped-input').is(':checked')
                        }
                    }
                }).get(),
            },
            songs: {
                types: {
                    openings: parseInt($('#packOpeningsInput').val()),
                    endings: parseInt($('#packEndingsInput').val()),
                    inserts: parseInt($('#packInsertsInput').val()),
                },
                difficulty: {
                    min: parseInt($('#songsDifficultyMinSlider').val()),
                    max: parseInt($('#songsDifficultyMaxSlider').val())
                }
            },
            animes: {
                images: true,
                kind: {
                    tv: $('#statusTVCheck').is(':checked'),
                    movie: $('#statusMovieCheck').is(':checked'),
                    ova: $('#statusOVACheck').is(':checked'),
                    ona: $('#statusONACheck').is(':checked'),
                    special: $('#statusSpecialCheck').is(':checked')
                }
            }
        }

        await window.electronAPI.generate(settings);
    });
    $('#generateButton').on('click', function (event) {
        event.preventDefault();

        $("#settingsForm").submit();
    })
});