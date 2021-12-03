const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createArrayCsvWriter;
const csvWriter = createCsvWriter({
	path: 'output.csv',
	header: [],
});

const results = [];

const getCsv = (fileIndex, files) => {
	const resultSet = [];
	let resultRow = 0;
	let readFlag = false;
	let passFlag = false;

	fs.createReadStream(path.join('CSV/', files[fileIndex]))
		.pipe(csv())
		.on('data', (data) => {
			if (data['_0'] && data['_0'].includes('CMDelta Test Start')) {
				readFlag = true;
			}

			if (readFlag && data['_0'] && data['_0'].includes('[Row')) {
				resultSet[resultRow] = [];
				for (const [key, value] of Object.entries(data)) {
					if (key !== '_0' && value !== '') {
						resultSet[resultRow].push(Number(value));
					}
				}
				resultRow++;
			}

			if (data['_0'] && data['_0'].includes('CMDelta Test  Result')) {
				if (data['_0'].includes('PASS')) {
					passFlag = true;
				} else {
					passFlag = false;
				}
			}

			if (data['_0'] && data['_0'].includes('CMDelta Test End')) {
				readFlag = false;
			}
		})
		.on('end', () => {
			if (passFlag) {
				results.push(resultSet);
			}

			if (files[fileIndex + 1]) {
				getCsv(fileIndex + 1, files);
			} else {
				const source = [];

				for (let setNum = 0; setNum < results.length; setNum++) {
					for (let rowNum = 0; rowNum < results[setNum].length; rowNum++) {
						if (!source[rowNum]) source[rowNum] = [];
						for (
							let colNum = 0;
							colNum < results[setNum][rowNum].length;
							colNum++
						) {
							source[rowNum][colNum] =
								(source[rowNum][colNum] || 0) +
								Number(results[setNum][rowNum][colNum]);
						}
					}
				}

				const average = [];
				const min = [];
				const max = [];

				for (let rowNum = 0; rowNum < source.length; rowNum++) {
					if (!average[rowNum]) average[rowNum] = [];
					if (!min[rowNum]) min[rowNum] = [];
					if (!max[rowNum]) max[rowNum] = [];
					for (let colNum = 0; colNum < source[rowNum].length; colNum++) {
						average[rowNum][colNum] =
							Math.round((source[rowNum][colNum] / results.length) * 1000) /
							1000;
						min[rowNum][colNum] =
							Math.round(average[rowNum][colNum] * 750) / 1000;
						max[rowNum][colNum] =
							Math.round(average[rowNum][colNum] * 1250) / 1000;
					}
				}

				const output = [];
				output.push(['Average']);
				output.push(...average);
				output.push(['Min']);
				output.push(...min);
				output.push(['Max']);
				output.push(...max);

				csvWriter
					.writeRecords(output)
					.then(() => {
						console.log('Done!!!');
					});
			}
		});
};

try {
	fs.readdir('CSV', (err, files) => {
		if (err) {
			console.error(err);
		} else {
			if (files.length > 0) {
				getCsv(0, files);
			}
		}
	});
} catch (err) {
	console.error(err);
}
