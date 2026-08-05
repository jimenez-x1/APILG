'use strict'

const path = require('path');
const db = require('../config/db');
const Archivo = db.archivo;
const Alumno = db.alumno;
const Grado = db.grado;
const Calificacion = db.calificacion;
const Clase = db.clase;
const PDFDocument = require('pdfkit');

const RUTA_BANNER = path.join(__dirname, '../assets/banner_gobierno.png');
const RUTA_ESCUDO = path.join(__dirname, '../assets/escudo_escuela.png');

const ESCUELA = {
    nombre: 'LUIS GAMERO',
    codigoSace: '070300079B10',
    municipio: 'DANLI',
    departamento: 'EL PARAÍSO',
    directoraNombre: 'M.s.C. Kenia Yojani Aguilera Castellanos',
    directoraTitulo: 'Directora Centro de Educación Básica Luis Gamero',
};

const PERSONALIDAD_FIJA = {
    puntualidad: 'SOBRESALIENTE',
    espirituTrabajo: 'SOBRESALIENTE',
    ordenPresentacion: 'SOBRESALIENTE',
    sociabilidad: 'SOBRESALIENTE',
    moralidad: 'SOBRESALIENTE',
    diasFaltados: 0,
};

function formatoGradoOficial(nombreGrado) {
    const mapa = {
        'primero': { texto: 'PRIMER GRADO', ciclo: 'I' },
        'segundo': { texto: 'SEGUNDO GRADO', ciclo: 'I' },
        'tercero': { texto: 'TERCER GRADO', ciclo: 'I' },
        'cuarto': { texto: 'CUARTO GRADO', ciclo: 'II' },
        'quinto': { texto: 'QUINTO GRADO', ciclo: 'II' },
        'sexto': { texto: 'SEXTO GRADO', ciclo: 'II' },
        'septimo': { texto: 'SÉPTIMO GRADO', ciclo: 'III' },
        'octavo': { texto: 'OCTAVO GRADO', ciclo: 'III' },
        'noveno': { texto: 'NOVENO GRADO', ciclo: 'III' },
    };
    const clave = (nombreGrado || '').trim().toLowerCase();
    const info = mapa[clave];
    if (!info) return (nombreGrado || 'No asignado').toUpperCase();
    return `${info.texto} (${info.ciclo} DE EDUCACION BASICA)`;
}

function valoracionCualitativa(promedio) {
    const nota = Number(promedio);
    if (isNaN(nota)) return 'N/D';
    if (nota >= 90) return 'EXCELENTE';
    if (nota >= 80) return 'MUY BUENO';
    if (nota >= 70) return 'BUENO';
    if (nota >= 60) return 'REGULAR';
    return 'INSUFICIENTE';
}

function fechaEnLetras() {
    const meses = [
        'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
        'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const hoy = new Date();
    return `A LOS ${hoy.getDate()} DIAS DEL MES DE ${meses[hoy.getMonth()]} DEL AÑO ${hoy.getFullYear()}`;
}

// Dibuja el membrete oficial (banner de gobierno + escudo de la escuela más grande) y devuelve la posición Y donde continuar.
function dibujarMembrete(doc, margenIzq, anchoUtil, compacto = false) {
    const factorBanner = compacto ? 0.62 : 1;
    const anchoBanner = anchoUtil * factorBanner;
    const altoBanner = anchoBanner * (102 / 710);
    const xBanner = margenIzq + (anchoUtil - anchoBanner) / 2;
    const yBanner = compacto ? 20 : 30;

    try {
        doc.image(RUTA_BANNER, xBanner, yBanner, { width: anchoBanner });
    } catch (e) {
        console.error('No se pudo cargar el banner de gobierno:', e.message);
    }

    const gapBanner = compacto ? 6 : 12;
    const yDespuesBanner = yBanner + altoBanner + gapBanner;

    // Escudo más grande (68 para compacto, 90 para normal) con gap ajustado para no mover el texto
    const anchoEscudo = compacto ? 68 : 90;
    const altoEscudo = anchoEscudo * (108 / 76);
    const xEscudo = margenIzq + (anchoUtil / 2) - (anchoEscudo / 2);

    try {
        doc.image(RUTA_ESCUDO, xEscudo, yDespuesBanner, { width: anchoEscudo });
    } catch (e) {
        console.error('No se pudo cargar el escudo de la escuela:', e.message);
    }

    const gapEscudo = compacto ? 8 : 14;
    return yDespuesBanner + altoEscudo + gapEscudo;
}

async function findAll(req, res){
    Archivo.findAll()
        .then(data => res.status(200).send(data))
        .catch(error => res.status(400).send(error));
}

async function insertArchivo(request, response){
    const archivoInsert = request.body;
    Archivo.create({
        Nombre_Archivo: archivoInsert.Nombre_Archivo,
        Tipo_Archivo: archivoInsert.Tipo_Archivo,
        Fecha_Subida: archivoInsert.Fecha_Subida
    })
    .then(data => response.status(200).send(data))
    .catch(error => response.status(400).send(error));
}

async function updateArchivo(request, response){
    const archivoUpdate = request.body;
    Archivo.update(archivoUpdate, { where: { ID_Archivo: archivoUpdate.ID_Archivo } })
    .then(num => {
        if(num == 1){
            response.status(200).send({ message: "Archivo actualizado correctamente" });
        } else {
            response.status(400).send({ message: "No se pudo actualizar el archivo" });
        }
    })
    .catch(error => response.status(500).send({ message: error.message || "Error al actualizar el archivo" }));
}

// ==========================================
// CONSTANCIA DE MATRÍCULA
// ==========================================
async function generarConstanciaMatricula(req, res) {
    const { dni } = req.params;

    try {
        const alumno = await Alumno.findByPk(dni, { include: [{ model: Grado }] });
        if (!alumno) return res.status(404).send({ message: "Alumno no encontrado" });

        const doc = new PDFDocument({ size: 'LETTER', margin: 70 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=constancia_${alumno.DNI}.pdf`);
        doc.pipe(res);

        const MARGEN = 70;
        const ANCHO_UTIL = 612 - MARGEN * 2;

        const yInicioTexto = dibujarMembrete(doc, MARGEN, ANCHO_UTIL);
        doc.y = yInicioTexto;

        doc.fontSize(15).font('Helvetica-Bold').text('CONSTANCIA DE MATRÍCULA', { align: 'center' });
        doc.moveDown(2);

        const nombreCompleto = `${alumno.Nombre} ${alumno.Apellido}`.toUpperCase();
        const gradoTexto = alumno.Grado ? formatoGradoOficial(alumno.Grado.Nombre_Grado) : 'NO ASIGNADO';
        const seccion = alumno.Grado?.Seccion || '';
        const anio = alumno.Grado?.Anio || new Date().getFullYear();

        doc.fontSize(11).font('Helvetica').text(
            `LA SUSCRITA DIRECTORA DEL CENTRO EDUCATIVO ${ESCUELA.nombre} CON CÓDIGO ${ESCUELA.codigoSace}, ` +
            `UBICADO EN EL MUNICIPIO DE ${ESCUELA.municipio} DEL DEPARTAMENTO DE ${ESCUELA.departamento}, ` +
            `EN USO DE SUS FACULTADES QUE LAS LEYES EDUCATIVAS LE CONFIERE,`,
            { align: 'justify' }
        );
        doc.moveDown();
        doc.font('Helvetica-Bold').text('HACE CONSTAR', { align: 'left' });
        doc.moveDown();

        doc.font('Helvetica').text(
            `QUE SEGÚN CONSTA EN EL LIBRO RESPECTIVO DE ESTA INSTITUCIÓN, SE ENCUENTRA REGISTRADO(A) ` +
            `EL (LA) ALUMNO(A) `,
            { align: 'justify', continued: true }
        );
        doc.font('Helvetica-Bold').text(nombreCompleto, { continued: true });
        doc.font('Helvetica').text(
            `, CON NÚMERO DE IDENTIDAD `,
            { continued: true }
        );
        doc.font('Helvetica-Bold').text(alumno.DNI, { continued: true });
        doc.font('Helvetica').text(
            `, MATRICULADO(A) EN ${gradoTexto}${seccion ? `, SECCIÓN "${seccion}"` : ''}, ` +
            `CORRESPONDIENTE AL AÑO LECTIVO ${anio}.`,
            { align: 'justify' }
        );

        doc.moveDown(2);
        doc.text(
            `Y PARA LOS FINES QUE AL INTERESADO(A) CONVENGA, SE LE EXTIENDE LA PRESENTE ` +
            `EN ${ESCUELA.municipio}, ${ESCUELA.departamento} ${fechaEnLetras()}.`,
            { align: 'justify' }
        );

        doc.moveDown(5);
        doc.font('Helvetica-Bold').text('_____________________________', { align: 'center' });
        doc.text(ESCUELA.directoraNombre, { align: 'center' });
        doc.font('Helvetica').fontSize(9).text(ESCUELA.directoraTitulo, { align: 'center' });

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message || "Error al generar la constancia" });
    }
}

// ==========================================
// CERTIFICACIÓN DE ESTUDIOS
// ==========================================
async function generarCertificacionEstudios(req, res) {
    const { dni } = req.params;

    try {
        const alumno = await Alumno.findByPk(dni, { include: [{ model: Grado }] });
        if (!alumno) return res.status(404).send({ message: "Alumno no encontrado" });

        const calificaciones = await Calificacion.findAll({
            where: { DNI_Alumno: dni },
            include: [{ model: Clase }]
        });

        const doc = new PDFDocument({ size: 'LETTER', margin: 55 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=certificacion_${alumno.DNI}.pdf`);
        doc.pipe(res);

        const MARGEN = 55;
        const ANCHO_UTIL = 612 - MARGEN * 2;
        const LEFT = MARGEN;
        const COL_VALOR = 310;

        const yInicioTexto = dibujarMembrete(doc, MARGEN, ANCHO_UTIL, true);
        doc.y = yInicioTexto;

        doc.fontSize(13).font('Helvetica-Bold').text('CERTIFICACION DE ESTUDIOS', { align: 'center' });
        doc.moveDown(0.7);

        doc.fontSize(9.5).font('Helvetica').text(
            `LA SUSCRITA DIRECTORA DEL CENTRO EDUCATIVO ${ESCUELA.nombre} CON CÓDIGO ${ESCUELA.codigoSace}, ` +
            `UBICADO EN EL MUNICIPIO DE ${ESCUELA.municipio} DEL DEPARTAMENTO DE ${ESCUELA.departamento}, ` +
            `EN USO DE SUS FACULTADES QUE LAS LEYES EDUCATIVAS LE CONFIERE,`,
            { align: 'justify' }
        );
        doc.moveDown(0.6);
        doc.font('Helvetica-Bold').fontSize(10.5).text('CERTIFICA', { align: 'left' });
        doc.moveDown(0.6);

        const nombreCompleto = `${alumno.Nombre} ${alumno.Apellido}`.toUpperCase();
        const gradoTexto = alumno.Grado ? formatoGradoOficial(alumno.Grado.Nombre_Grado) : 'NO ASIGNADO';
        const anio = alumno.Grado?.Anio || new Date().getFullYear();

        doc.font('Helvetica').fontSize(9.5).text(
            `QUE SEGÚN CONSTA EN EL LIBRO RESPECTIVO DE ESTA INSTITUCIÓN EN EL AÑO ${anio}, ` +
            `SE ENCUENTRA REGISTRADO(A) EL (LA) ALUMNO(A) ${nombreCompleto} CON NÚMERO DE IDENTIDAD ${alumno.DNI}, ` +
            `DE ${gradoTexto}, Y OBTUVO LAS VALORACIONES Y CALIFICACIONES SIGUIENTES:`,
            { align: 'justify' }
        );
        doc.moveDown(0.9);

        const filaDosColumnas = (etiqueta, valor, negritaValor = true) => {
            const y = doc.y;
            doc.font('Helvetica').fontSize(9.5).text(etiqueta, LEFT, y);
            doc.font(negritaValor ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).text(valor, COL_VALOR, y);
            doc.moveDown(0.42);
        };

        doc.font('Helvetica-Bold').fontSize(10.5).text('PERSONALIDAD', LEFT, doc.y);
        doc.moveDown(0.4);

        filaDosColumnas('Puntualidad', PERSONALIDAD_FIJA.puntualidad);
        filaDosColumnas('Espíritu de trabajo', PERSONALIDAD_FIJA.espirituTrabajo);
        filaDosColumnas('Orden y presentación', PERSONALIDAD_FIJA.ordenPresentacion);
        filaDosColumnas('Sociabilidad', PERSONALIDAD_FIJA.sociabilidad);
        filaDosColumnas('Moralidad', PERSONALIDAD_FIJA.moralidad);

        doc.moveDown(0.5);

        doc.font('Helvetica-Bold').fontSize(10.5).text('AREAS CURRICULARES', LEFT, doc.y);
        doc.moveDown(0.4);

        if (calificaciones.length === 0) {
            doc.font('Helvetica').fontSize(9.5).text('No hay calificaciones registradas para este alumno.', LEFT, doc.y);
            doc.moveDown(0.6);
        } else {
            let sumaPromedios = 0;
            let contador = 0;

            calificaciones.forEach((c) => {
                const nombreClase = c.Clase?.Nombre_Clase || 'Materia';
                const parciales = [c.Parcial1, c.Parcial2, c.Parcial3, c.Parcial4]
                    .filter(p => p !== null && p !== undefined && p !== "")
                    .map(Number);
                const promedio = parciales.length === 0
                    ? null
                    : parciales.reduce((s, v) => s + v, 0) / parciales.length;

                if (promedio !== null) {
                    filaDosColumnas(nombreClase, `${promedio.toFixed(0)}% ${valoracionCualitativa(promedio)}`);
                    sumaPromedios += promedio;
                    contador++;
                } else {
                    filaDosColumnas(nombreClase, 'Sin promedio');
                }
            });

            doc.moveDown(0.3);
            filaDosColumnas('DIAS FALTADOS EN EL AÑO', String(PERSONALIDAD_FIJA.diasFaltados));

            if (contador > 0) {
                const promedioFinal = sumaPromedios / contador;
                filaDosColumnas('PROMEDIO FINAL', `${promedioFinal.toFixed(0)}%`);
            }
        }

        doc.moveDown(0.9);
        doc.font('Helvetica').fontSize(9.5).text(
            `Y PARA LOS FINES QUE AL INTERESADO(A) CONVENGA, SE LE EXTIENDE LA PRESENTE ` +
            `EN ${ESCUELA.municipio}, ${ESCUELA.departamento} ${fechaEnLetras()}.`,
            LEFT, doc.y,
            { align: 'justify', width: ANCHO_UTIL }
        );

        doc.moveDown(2.5);
        doc.font('Helvetica-Bold').fontSize(9.5).text('_____________________________', { align: 'center' });
        doc.text(ESCUELA.directoraNombre, { align: 'center' });
        doc.font('Helvetica').fontSize(8.5).text(ESCUELA.directoraTitulo, { align: 'center' });

        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send({ message: error.message || "Error al generar la certificación" });
    }
}

module.exports = {
    findAll,
    insertArchivo,
    updateArchivo,
    generarConstanciaMatricula,
    generarCertificacionEstudios
}