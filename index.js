const axios = require("axios");
const express = require("express");
const Table = require("cli-table3");

const app = express();

const style = (color) => `text-align: center; font-size: 10em; font-family: fantasy; background: #5ee35e; padding: 100px; color:${color};`;

const rankColors = [
  { max: 5000, color: "#b0c3d9" },
  { max: 10000, color: "#8cc6ff" },
  { max: 15000, color: "#4B69FF" },
  { max: 20000, color: "#8846FF" },
  { max: 25000, color: "#FED700" },
  { max: 30000, color: "#EB4B4B" },
];


app.get("/", async (req, res) => {
  const data = await checkAPI();
  color = rankColors.find(({ max }) => data.puntosPremier <= max)?.color || "#FED700";
  const contenido = `<div style="${style(color)}">${data.puntosPremier}</div>`;
  res.send(contenido);
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});

// Saca el resultado de una partida, el mapa, y cuando fue la partida
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
const checkAPI = async () => {
  return await axios
    .get(`https://api.leetify.com/api/mini-profiles/76561197963101144`)
    .then(({ data }) => data)
    .then(async ({ name, primaryRank, recentMatches, steam64Id }) => {
      console.clear();
      const ultimasPartidas = await Promise.all(
        recentMatches.map(async ({ id, result }) => {
          const datosPartida = await partida(id, result);
          return datosPartida;
        })
      );
      const res = {
        nombre: name,
        puntosPremier: primaryRank.skillLevel,
        partidas: ultimasPartidas,
        resultado: ultimasPartidas.resultado,
        id: steam64Id
      };
      const ahora = new Date().toLocaleString();

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
      var table = new Table({
        head: ["Rango Premier", "Ultima consulta", "Racha"],
        colWidths: [35, 30, 30 ]
      });
      table.push([res.puntosPremier, ahora, res.partidas[4].rank - res.partidas[0].oldRank]);
      console.log(table.toString());
      return res;
    });
};
