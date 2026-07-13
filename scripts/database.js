let target = 'rinkeby'

const { createClient } = require('@supabase/supabase-js');
const NETWORKIDS = [
    { chainId: "0", network: "bitcoin" },
    { chainId: "1", network: "mainnet" },
    { chainId: "4", network: "rinkeby" },
    { chainId: "5", network: "goerli" },
    { chainId: "56", network: "bsc" },
    { chainId: "100", network: "xdai" },
    { chainId: "137", network: "polygon" },
    { chainId: "250", network: "fantom" },
    { chainId: "80001", network: "mumbai" },
    { chainId: "1313161554", network: "aurora" },
]
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });
const supabase = createClient(`https://${process.env.SUPABASE_API_ENDPOINT_KEY}.supabase.co`, process.env.SUPABASE_API_KEY);

let chainId = NETWORKIDS.find(item=>item.network === target).chainId
const fs = require('fs');
const path = require('path');
let EmblemVaultSDK = require('emblem-vault-sdk').default
const sdk = new EmblemVaultSDK(process.env.EMBLEM_API_KEY);

async function saveToDb() {    
    let rawdata = fs.readFileSync(path.join(__dirname, `../deployed-${target}.json`));
    let jsonData = JSON.parse(rawdata);
    for (let i = 0; i < Object.keys(jsonData).length; i++) {
        let contractKey = Object.keys(jsonData)[i];
        let contract = jsonData[contractKey];
        let contractType
        
        if(contractKey.startsWith('upgradable')) {
            contractType = contractKey.replace('upgradable', '').split('_')[0].toLowerCase()
        }
        console.log(chainId, contractKey, contract.address, contractType);
        
        const { data, error } = await supabase.from('deployment').upsert({ address: contract.address, name: contractKey, type: contractType, chainId: chainId, network: target }, { onConflict: ['chainId', 'address'] })
        console.log(data, error)
    }
    // console.log(jsonData);
    // console.log(NETWORKIDS)
}

async function doStuff() {
    await saveToDb()
}

doStuff()



