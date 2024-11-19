const axios = require("axios");
const express = require("express");
const Table = require("cli-table3");
const { exec } = require("child_process");

const app = express();

// Estilo para el navegador
const style = (color) =>
  `text-align: center; font-size: 10em; font-family: fantasy; background: #5ee35e; padding: 100px; color:${color};`;

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
app.get("/", async (req, res) => {
  try {
    const data = await checkAPI();
    const color =
      rankColors.find(({ max }) => data.puntosPremier <= max)?.color ||
      "#FED700";
    const contenido = `<div style="${style(color)}">${data.puntosPremier}</div>`;
    res.send(contenido);
  } catch (error) {
    console.error("Error al consultar la API:", error.message);
    res.status(500).send("Error interno del servidor");
  }
});

// Arrancamos el servidor en el puerto 3000
app.listen(3000, () => {
  console.log("Abriendo Chrome en la ruta http://localhost:3000");
  exec('start chrome "http://localhost:3000"');
});

// Función para obtener datos de una partida
const partida = async (id, resultado) => {
  try {
    const { data } = await axios.get(`https://api.leetify.com/api/games/${id}`);
    const { mapName, teamScores, finishedAt, matchmakingGameStats } = data;
    const winloss =
      resultado === "win"
        ? "Victoria"
        : resultado === "loss"
        ? "Derrota"
        : "Empate";
    const jugador = matchmakingGameStats.find(
      (p) => p.steam64Id === "76561197963101144"
    );

    return {
      mapa: mapName,
      resultados:
        winloss === "Victoria"
          ? teamScores.sort((a, b) => b - a)
          : winloss === "Derrota"
          ? teamScores.sort((a, b) => a - b)
          : teamScores,
      fecha: new Date(finishedAt).toLocaleString(),
      resultado: winloss,
      rank: jugador?.rank || null,
      oldRank: jugador?.oldRank || null,
      rankType: jugador?.rankType || null,
      cambio: jugador?.rankChanged || false,
    };
  } catch (error) {
    console.error(`Error al obtener datos de partida ${id}:`, error.message);
    return null;
  }
};

// Función para consultar la API y mostrar resultados
const checkAPI = async () => {
  try {
    const { data } = await axios.get(
      `https://api.leetify.com/api/mini-profiles/76561197963101144`
    );
    const { name, primaryRank, recentMatches } = data;

    console.clear();

    const ultimasPartidas = (
      await Promise.all(
        recentMatches.map(({ id, result }) => partida(id, result))
      )
    ).filter(Boolean);

    const res = {
      nombre: name,
      puntosPremier: primaryRank.skillLevel,
      partidas: ultimasPartidas,
    };

    const ahora = new Date().toLocaleString();

    const table2 = new Table({
      head: ["Mapa", "Marcadores", "Fecha", "Anterior", "Nuevo", "ELO"],
      colWidths: [20, 15, 30, 10, 10, 10],
    });

    ultimasPartidas.forEach((partida) => {
      if (partida) {
        table2.push([
          partida.mapa,
          Array.isArray(partida.resultados)
            ? partida.resultados.join(":")
            : "N/A",
          partida.fecha,
          partida.oldRank || "N/A",
          partida.rank || "N/A",
          partida.cambio
            ? (partida.rank || 0) - (partida.oldRank || 0)
            : partida.rank || "N/A",
        ]);
      }
    });

    console.log(table2.toString());

    const table = new Table({
      head: ["Rango Premier", "Última consulta", "Racha"],
      colWidths: [35, 30, 30],
    });

    table.push([
      res.puntosPremier,
      ahora,
      ultimasPartidas.length > 4
        ? (ultimasPartidas[4].rank || 0) -
          (ultimasPartidas[0].oldRank || 0)
        : "N/A",
    ]);

    console.log(table.toString());

    return res;
  } catch (error) {
    console.error("Error al consultar la API principal:", error.message);
    throw error;
  }
};
