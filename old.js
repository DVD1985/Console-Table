const axios = require("axios");
const express = require("express");
const Table = require("cli-table3");
const { exec } = require("child_process");

const app = express();

// Estilo para el navegador
const style = (color) => `text-align: center; font-size: 10em; font-family: fantasy; background: #5ee35e; padding: 100px; color:${color};`;

// Los colores de los rangos
const rankColors = [
  { max: 5000, color: "#b0c3d9" },
  { max: 10000, color: "#8cc6ff" },
  { max: 15000, color: "#4B69FF" },
  { max: 20000, color: "#8846FF" },
  { max: 25000, color: "#FED700" },
  { max: 30000, color: "#EB4B4B" },
];

// Ruta principal para el navegador
// Cada vez que se refresca se ejecuta una petición
app.get("/", async (req, res) => {
  // Consultamos la API
  const data = await checkAPI();
  // Ponemos el color del texto
  const color = rankColors.find(({ max }) => data.puntosPremier <= max)?.color || "#FED700";
  // Creamos el elemento HTML
  const contenido = `<div style="${style(color)}">${data.puntosPremier}</div>`;
  // Mostramos el resultado
  res.send(contenido);
});

// Arrancamos el servidor en el puerto 3000
app.listen(3000, () => { 
  console.log("Abriendo Chrome en la ruta localhost:3000");
  exec('start chrome "http://localhost:3000"');
});

// Saca el resultado de una partida, el mapa, y cuando fue la partida
// Ademas las siguientes propiedades 
//
// mapa: puede ser cualquier mapa de premier o competitivo
// resultados: ordena el marcador en función de si fue victoria o derrota, calculado previamente en 47
// fecha: cuando se jugó la partida y se terminó
// resultado: textualmente si fue victoria, derrota o empate
// rank: el nuevo rango
// oldRank: el rango viejo
// rankType: 11 para premier 12 para competitivo
// cambio: true o false, si hubo cambio en el rango
const partida = async (id, resultado) => {
  const data = await axios
    .get(`https://api.leetify.com/api/games/${id}`)
    .then(({ data }) => data)
    .then(({ mapName, teamScores, finishedAt,matchmakingGameStats }) => {
      const winloss =
        resultado == "win"
          ? "Victoria"
          : resultado == "loss"
          ? "Derrota"
          : "Empate";
      const jugador = matchmakingGameStats.find( p => p.steam64Id == "76561197963101144");
      const res = {
        mapa: mapName,
        resultados:
          winloss == "Victoria"
            ? teamScores.sort((a, b) => b - a)
            : winloss == "Derrota"
            ? teamScores.sort((a, b) => a - b)
            : "Empate",
        fecha: new Date(finishedAt).toLocaleString(),
        resultado: winloss,
        rank: jugador.rank,
        oldRank: jugador.oldRank,
        rankType: jugador.rankType,
        cambio: jugador.rankChanged
      };
      return res;
    });
  return data;
};

// Funcion que devuelve un el mini-perfil de un jugador
// y función principal donde se consulta la API
// y se muestran las tablas con los resultados
const checkAPI = async () => {
  return await axios
    .get(`https://api.leetify.com/api/mini-profiles/76561197963101144`)
    .then(({ data }) => data)
    .then(async ({ name, primaryRank, recentMatches, steam64Id }) => {
      // Borramos la consola antes de exponer los resultados
      console.clear();
      // Extraemos la información de las partidas
      const ultimasPartidas = await Promise.all(
        recentMatches.map(async ({ id, result }) => {
          return await partida(id, result);
        })
      );
      // Juntamos todo
      const res = {
        nombre: name,                                // Nombre del jugador
        puntosPremier: primaryRank.skillLevel,       // Sacamos el rango de premier de la propiedad primaryRank
        partidas: ultimasPartidas,                   // Partidas recientes
        resultado: ultimasPartidas.resultado,        // Resultado de la partida
      };
      // Guardamos el tiempo de la petición para mostrarlo por consola
      const ahora = new Date().toLocaleString();
      // Tabla con las partidas: mapa|marcador|fecha|rangoantiguo|rangonuevo|elo
      var table2 = new Table({
        head: ["Mapa", "Marcadores", "Fecha", 'anterior', 'nuevo', 'ELO'],
        colWidths: [20, 15, 30, 10,10,10]
      });
      res.partidas.forEach((partida) => {
        table2.push([
          partida.mapa,
          partida.resultados.join(":"),
          partida.fecha,
          partida.oldRank,
          partida.rank,
          partida.cambio ? partida.rank - partida.oldRank  : partida.rank
        ]);
      });
      console.log(table2.toString());
      // Tabla con los datos deseados: rango premier|ultima consulta|racha de las últimas 5 partidas (cambio de elo)
      var table = new Table({
        head: ["Rango Premier", "Ultima consulta", "Racha"],
        colWidths: [35, 30, 30 ]
      });
      table.push([res.puntosPremier, ahora, res.partidas[4].rank - res.partidas[0].oldRank]);
      console.log(table.toString());
      // Devolvemos toda la información (aunque solo usaremos el rango premier)
      return res;
    });
};
