//-------------------------------------------------------------------
// Ingress-router for Big-data clusters [Node.js]
//
// Dongwoo Kwon {dwkwon80@gmail.com}, 2020-03-25
//-------------------------------------------------------------------

'use strict';

const debug = require('debug')('ingress-router:app');
const express = require('express');

const {releaseAllModules} = require('./manager/module-manager');
const confIr = require('./conf/config').ingressRouter;

const irInetPort = confIr.port || 40001;
const irUdsFile = confIr.unixDomainSocket || '/tmp/ingress-router.sock';

const apiRouteV1 = require('./routes/apiroute-v1');

const app = express();


app.use(express.json({limit: '1024kb', strict: true}));

app.use('/v1', apiRouteV1);

app.use((req, res, next) => res.sendStatus(404));


let ingressRouterInet = app.listen(irInetPort, () => {
    debug('Started Ingress-router on HTTP port %o', irInetPort);
});

ingressRouterInet.on('error', (err) => {
    debug('ERROR:', err);
    process.exit(1);
});

ingressRouterInet.keepAliveTimeout = 5000;


let ingressRouterUds = app.listen(irUdsFile, () => {
    debug('Started Ingress-router on Unix domain socket %o', irUdsFile);
});

ingressRouterUds.on('error', (err) => {
    debug('ERROR:', err);
    process.exit(1);
});


process.on('warning', (e) => debug('WARN:', e.stack));

process.on('unhandledRejection', (reason, p) => {
    debug('ERROR: UNHANDLED REJECTION at Promise: %O, Reason: %s, Stack: %s',
        p, reason, reason.stack);
});

process.on('uncaughtException', (err) => {
    debug('ERROR: UNCAUGHT EXCEPTION:', err);
});

['exit', 'SIGINT', 'SIGTERM', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, (code) => {
        releaseAllModules();

        if (ingressRouterInet) {
            ingressRouterInet.close();
            ingressRouterInet = null;
        }

        if (ingressRouterUds) {
            ingressRouterUds.close();
            ingressRouterUds = null;
        }

        if (signal === 'exit') {
            debug('Stopped Ingress-router');
        } else {
            process.exit(code);
        }
    })
});


module.exports = app;
