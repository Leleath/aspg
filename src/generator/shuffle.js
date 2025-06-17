
const shuffle = function (data) {
    let tempData = data;

    for (let shuffleCount = 0; shuffleCount < 10; shuffleCount++) {
        for (let index = 0; index < tempData.length; index++) {
            const randomIndex = Math.floor(Math.random() * tempData.length);
            const temp = tempData[index];
            tempData[index] = tempData[randomIndex]
            tempData[randomIndex] = temp;
        }
    }

    return tempData;
} 

export default shuffle;