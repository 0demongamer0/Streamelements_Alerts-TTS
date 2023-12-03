function storeConfigToJs(config){
    return new Blob([config], { type: 'application/javascript' });
}