const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const datasetPath = path.join(__dirname, '../data/tracks.csv');

async function getTrackDetails(trackIds) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(datasetPath)
            .pipe(csv())
            .on('data', (data) => {
                // Verificar si el ID de la canción está en trackIds
                if (trackIds.includes(data.id)) {
                    // Solo agregar los valores necesarios
                    results.push({
                        name: data.name,    
                        id: data.id,                 
                        tempo: parseFloat(data.tempo),        
                        key: parseInt(data.key),         
                        danceability: parseFloat(data.danceability), 
                        energy: parseFloat(data.energy) 
                    });
                }
            })
            .on('end', () => resolve(results))  // Resolver la promesa con los resultados
            .on('error', (err) => reject(err)); // Rechazar si hay un error
    });
}

module.exports = { getTrackDetails };
