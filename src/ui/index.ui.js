// Preload workers in webpack, force webpack to compile them
import BlockbookWorker from 'worker-loader?name=blockbook-worker!../workers/blockbook/index.ts';
import RippleWorker from 'worker-loader?name=ripple-worker!../workers/ripple/index.ts';

import CONFIG from './config'; 
import BlockchainLink from '../index';

const handleClick = (event) => {
    const {target} = event;
    if (target.nodeName.toLowerCase() !== 'button') return;
    const network = getInputValue('network-type');

    // const blockchain: Blockchain<Ripple> = BlockchainLink.get('Ripple Testnet');
    const blockchain = instances.find(b => b.settings.name === network);
    if (!blockchain) return;
    
    const parentContainer = target.parentElement;
    const onResponse = handleResponse.bind(this, parentContainer);
    const onError = handleError.bind(this, parentContainer);

    switch (target.id) {
        case 'disconnect':
            blockchain.disconnect().then(onResponse).catch(onError);
            break;

        case 'get-info':
            blockchain.getInfo().then(onResponse).catch(onError);
            break;
        
        case 'get-account-info': {
            const payload = {
                descriptor: getInputValue('get-account-info-address'),
                details: getInputValue('get-account-info-mode') || 'basic',
                pageSize: getInputValue('get-account-info-pageSize') || 25,
                tokens: getInputValue('get-account-info-tokens') ||'derived',
                page: parseInt(getInputValue('get-account-info-page'), 2) || 10,
                from: parseInt(getInputValue('get-account-info-from'), 2) ,
                to: parseInt(getInputValue('get-account-info-to'), 2) ,
                contractFilter: getInputValue('get-account-info-contract') || '',
            };
            blockchain.getAccountInfo(payload).then(onResponse).catch(onError);
            break;
        }

        case 'estimate-fee':
            blockchain.estimateFee().then(onResponse).catch(onError);
            break;

        case 'push-transaction':
            blockchain.pushTransaction(getInputValue('push-transaction-tx')).then(onResponse).catch(onError);
            break;

        case 'subscribe-block':
            blockchain.subscribe({
                type: 'block'
            }).catch(onError);
            break;

        case 'unsubscribe-block':
            blockchain.unsubscribe({
                type: 'block'
            }).catch(onError);
            break;

        case 'subscribe-address':
            blockchain.subscribe({
                type: 'notification',
                addresses: getInputValue('subscribe-addresses').split(","),
            }).catch(onError);
            break;

        case 'unsubscribe-address':
            blockchain.unsubscribe({
                type: 'notification',
                addresses: getInputValue('subscribe-addresses').split(","),
            }).catch(onError);
            break;

        default: break;
    }
}

const handleResponse = (parent, response) => prepareResponse(parent, response);

const handleError = (parent, error) => prepareResponse(parent, error.message, true);

const handleBlockEvent = (blockchain, notification) => {
    const network = getInputValue('network-type');
    if (blockchain.settings.name !== network) return;
    const parent = (document.getElementById('notification-block'));
    prepareResponse(parent, notification);
}

const handleNotificationEvent = (blockchain, notification) => {
    const network = getInputValue('network-type');
    if (blockchain.settings.name !== network) return;

    const parent = (document.getElementById('notification-address'));
    prepareResponse(parent, notification);
}

const handleConnectionEvent = (blockchain, status) => {
    const parent = (document.getElementById('notification-status'));
    prepareResponse(parent, {
        blockchain: blockchain.settings.name,
        connected: status,
    }, !status);
}

const handleErrorEvent = (blockchain, message) => {
    const parent = (document.getElementById('notification-status'));
    prepareResponse(parent, message, true);
}

const prepareResponse = (parent, response, isError = false) => {
    const div = document.createElement('pre');
    div.className = isError ? 'response error' : 'response';
    const close = document.createElement('div');
    close.className = 'close';
    close.onclick = () => {
        if (div.parentElement) div.parentElement.removeChild(div);
    }
    div.append(close);
    const pre = document.createElement('pre');
    pre.innerHTML = JSON.stringify(response, null , 2);
    div.appendChild(pre);

    const otherResponses = parent.getElementsByClassName('response');
    if (otherResponses.length > 0) {
        if (otherResponses.length >= 3) {
            parent.removeChild(otherResponses[2]);
        }
        parent.insertBefore(div, otherResponses[0]);
    } else {
        parent.appendChild(div);
    }
}


// utils

const onClear = () => {
    const responses = document.getElementsByClassName('response');
    while (responses.length) {
        const r = responses[0];
        if (r.parentElement) r.parentElement.removeChild(r);
    }
}

const getInputValue = (id) => {
    const {value} = document.getElementById(id);
    return value;
}

const setInputValue = (id, value) => {
    const element = (document.getElementById(id));
    element.value = value;
}

const onSelectChange = (event) => {
    const {value} = event.target;
    const b = CONFIG.find(i => i.blockchain.name === value);
    fillValues(b.data);
    onClear();
}

const onAccountInfoModeChange = (event) => {
    const advanced = (document.getElementById('get-account-info-advanced'));
    advanced.style.display = event.target.value === 'advanced' ? 'block' : 'none';
}

const onEstimateFeeModeChange = (event) => {
    const advanced = (document.getElementById('estimate-fee-advanced'));
    advanced.style.display = event.target.value === 'advanced' ? 'block' : 'none';
}

const fillValues = (data) => {
    setInputValue('get-account-info-address', data.address);
    setInputValue('get-account-info-options', JSON.stringify(data.accountInfoOptions, null, 2));
    setInputValue('estimate-fee-options', JSON.stringify(data.estimateFeeOptions, null, 2));
    setInputValue('push-transaction-tx', data.tx);
    setInputValue('subscribe-addresses', data.subscribe);
}

const init = (instances) => {
    const select = (document.getElementById('network-type'));
    select.innerHTML = instances.map(i => {
        const b = i.blockchain;
        if (i.selected) {
            fillValues(i.data);
            return `<option value="${b.name}" selected>${b.name}</option>`;
        } 
        return `<option value="${b.name}">${b.name}</option>`;
        
    });
    select.onchange = onSelectChange;

    const clear = (document.getElementById('clear'));
    clear.onclick = onClear;

    const accountInfoMode = (document.getElementById('get-account-info-mode'));
    accountInfoMode.onchange = onAccountInfoModeChange;

    const estimateFeeMode = (document.getElementById('estimate-fee-mode'));
    estimateFeeMode.onchange = onEstimateFeeModeChange;
}

init(CONFIG);

const instances = [];
CONFIG.forEach(i => {
    const b = new BlockchainLink(i.blockchain);
    b.on('connected', handleConnectionEvent.bind(this, b, true));
    b.on('disconnected', handleConnectionEvent.bind(this, b, false));
    b.on('error', handleErrorEvent.bind(this, b, false));
    b.on('block', handleBlockEvent.bind(this, b));
    b.on('notification', handleNotificationEvent.bind(this, b));
    instances.push(b);
});

document.addEventListener('click', handleClick);
