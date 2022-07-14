import { faker } from '@faker-js/faker';
import axios from 'axios';
import FormData from "form-data";
import { mkdir, rm } from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import envs from 'dotenv'
envs.config()

const API_URL: string | undefined = process.env.API_URL;
const TARTGET: number = 50;
const MIN_EMPLACEMENTS = 7;
const MAX_EMPLACEMENTS = 20;
const MIN_COMMANDES = 7;
const MAX_COMMANDES = 20;
const MIN_TABLEAUS = 7;
const MAX_TABLEAUS = 20;
const TOKEN: string | undefined = process.env.TOKEN;

type Media = {
    id: string;
}

type Company = {
    id: string | null;
    name: string;
    logo: string;
    description: string;
}

type Emplacement = {
    id: string | null;
    name: string;
    description: string;
    societe: string;
}

type Commande = {
    id: string | null;
    name: string;
    price: number;
    emplacement: string;
}

type Tableau = {
    id: string | null;
    des: string;
    designation: string;
    unite: string;
    quantite: number;
    avance: boolean;
    commande: string;
}

const clearLine = () => process.stdout.write('\x1b[2K\r');
const Random = (min: number, max: number) => Math.floor(Math.random() * (max - min) + min);
const Sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

console.log(`Target Images: ${TARTGET}`);
console.log(`Target companies: ${TARTGET}`);
console.log(`Target emplacements: [${MIN_EMPLACEMENTS}-${MAX_EMPLACEMENTS}] each company`);
console.log(`Target commandes: [${MIN_COMMANDES}-${MAX_COMMANDES}] each emplacement`);
console.log(`Target tableaus: [${MIN_TABLEAUS}-${MAX_TABLEAUS}] each commande\`n`);

const generate = async () => {

    console.log('Downloading images...');
    try {
        await mkdir('images');
    }
    catch (e) {
        console.log('Images folder already exists deleting it...');
        await rm('images', { recursive: true });
        await mkdir('images');
    }
    for (let i = 0; i < TARTGET; i++) {
        let resp = await axios.get(
            faker.image.city(), {
            responseType: 'stream',
        })
        let stream = createWriteStream(`images/${i}.jpg`)
        resp.data.pipe(stream);
        stream.on('finish', () => {
            clearLine();
            process.stdout.write(`[${(i * 100 / TARTGET).toFixed(2)}%] - Image ${i} downloaded\r`);
        })
    }
    await Sleep(3000);
    clearLine();
    console.log('Images downloaded');
    console.log('Uploading images...');
    const media: Media[] = [];
    for (let i = 0; i < TARTGET; i++) {

        let formData = new FormData();
        formData.append('file', createReadStream(`images/${i}.jpg`));
        let resp = await axios({
            method: 'post',
            url: `${API_URL}/media`,
            data: formData,
            headers: { ...formData.getHeaders(), 'Authorization': 'JWT ' + TOKEN },
        });
        media.push(resp.data.doc);
        clearLine();
        process.stdout.write(`[${(i * 100 / TARTGET).toFixed(2)}%] - Uploaded image ${i} with id ${resp.data.doc.id}\r`);
    }

    clearLine();
    console.log(`${media.length} images uploaded !`);
    console.log('Generating companies...');

    const companies: Company[] = [];
    for (let i = 0; i < TARTGET; i++) {
        companies.push({
            id: null,
            name: faker.company.companyName(),
            logo: media[i].id,
            description: faker.company.bs(),
        });
    }

    console.log('Sending companies...');
    for (let i = 0; i < TARTGET; i++) {
        let resp = await axios({
            method: 'post',
            url: `${API_URL}/societes`,
            data: companies[i],
            headers: { 'Authorization': 'JWT ' + TOKEN },
        });
        clearLine();
        process.stdout.write(`[${(i * 100 / TARTGET).toFixed(2)}%] - Created company ${resp.data.doc.id} with name ${resp.data.doc.name}\r`);
        companies[i].id = resp.data.doc.id;
    }
    clearLine();
    console.log(`${companies.length} companies created !`);

    console.log('Generating Emplacements...');
    const emplacements: Emplacement[] = [];

    for (let i = 0; i < TARTGET; i++) {
        for (let j = 0; j < Random(MIN_EMPLACEMENTS, MAX_EMPLACEMENTS); j++) {
            emplacements.push({
                id: null,
                name: faker.address.cityName(),
                description: faker.address.buildingNumber(),
                societe: companies[i].id as string,
            });
        }
    }

    console.log(`${emplacements.length} Emplacements Generated !`);
    console.log('Sending Emplacements...');

    for (let i = 0; i < emplacements.length; i++) {
        let resp = await axios({
            method: 'post',
            url: `${API_URL}/emplacements`,
            data: emplacements[i],
            headers: { 'Authorization': 'JWT ' + TOKEN },
        });
        clearLine();
        process.stdout.write(`[${(i * 100 / emplacements.length).toFixed(2)}%] - Created emplacement ${resp.data.doc.id} with name ${resp.data.doc.name}\r`);
        emplacements[i].id = resp.data.doc.id;
    }

    clearLine();
    console.log(`${emplacements.length} emplacements created !`);

    console.log('Generating Commandes...');
    const commandes: Commande[] = [];

    for (let i = 0; i < emplacements.length; i++) {
        for (let j = 0; j < Random(MIN_COMMANDES, MAX_COMMANDES); j++) {
            commandes.push({
                id: null,
                name: faker.commerce.productName(),
                price: Random(1, 100),
                emplacement: emplacements[i].id as string,
            });
        }
    }

    console.log(`${commandes.length} Commandes Generated !`);
    console.log('Sending Commandes...');

    for (let i = 0; i < commandes.length; i++) {
        try {
            let resp = await axios({
                method: 'post',
                url: `${API_URL}/commandes?depth=0`,
                data: commandes[i],
                headers: { 'Authorization': 'JWT ' + TOKEN },
            });
            clearLine();
            process.stdout.write(`[${(i * 100 / commandes.length).toFixed(2)}%] - Created commande ${resp.data.doc.id} with name ${resp.data.doc.name}\r`);
            commandes[i].id = resp.data.doc.id;
        }
        catch(e) {
            console.log(`Error while sending commande ${commandes[i].id} with name ${commandes[i].name}`);
            commandes.splice(i, 1);
            i--;
        }
    }

    clearLine();
    console.log(`${commandes.length} commandes created !`);

    console.log('Generating Tableaus...');
    const tableaus: Tableau[] = [];

    for (let i = 0; i < commandes.length; i++) {
        for (let j = 0; j < Random(MIN_TABLEAUS, MAX_TABLEAUS); j++) {
            tableaus.push({
                id: null,
                des: `D${j}`,
                designation: "Designation " + Random(1, 100),
                unite: faker.science.unit().symbol,
                avance: Random(1, 100) % 2 === 0,
                commande: commandes[i].id as string,
                quantite: Random(1, 100),
            });
        }
    }

    console.log(`${tableaus.length} Tableaus Generated !`);
    console.log('Sending Tableaus...');

    for (let i = 0; i < tableaus.length; i++) {
        try {
            let resp = await axios({
                method: 'post',
                url: `${API_URL}/tableaus?depth=0`,
                data: tableaus[i],
                headers: { 'Authorization': 'JWT ' + TOKEN },
            });
            clearLine();
            process.stdout.write(`[${(i * 100 / tableaus.length).toFixed(2)}%] - Created tableau ${resp.data.doc.id} with name ${resp.data.doc.designation}\r`);
            tableaus[i].id = resp.data.doc.id;
        }
        catch(e) {
            console.log(`Error while sending tableau ${tableaus[i].id} with name ${tableaus[i].designation}`);
            tableaus.splice(i, 1);
            i--;
        }
    }

    clearLine();
    console.log(`${tableaus.length} tableaus created !`);

}


generate();