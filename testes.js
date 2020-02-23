var express = require('express');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);


app.use(express.static(__dirname + "/public"));// chama o index.html
app.get('/fila', (req, res)=>{
    res.sendFile(__dirname + '/public/Esperar.html')
})
app.get('/bootstrap', (req, res)=>{
    res.sendFile(__dirname + '/public/ldr.html')
})

//############ corpo!!!!#############
{
  //########## variaveis da experimentação
    let alertaLuz = 30;
    let ciclos = 25;
    let luzPercentual
    let vetorDados = []
    let users =[]
    let connections = []
    let estadoStart = false;
    let connectionEstado = ['off', 'off']
    
    i = 0;
    f = 2000;

     //################################ Iniciar o experimento #################################
     io.on('connection', function(socket){
        if(connectionEstado[0] == 'on'){
            socket.emit('sincronizarLuzON');
        }else if (connectionEstado[0] == 'off'){
            socket.emit('sincronizarLuzOff');
        }
        if(connectionEstado[1] == 'on'){
            socket.emit('sincronizarStartOn');
            io.emit('sincronizarLED', { LDR: alertaLuz });
        }

        socket.on('ligar', () => {
            console.log('o estadoStart: ', estadoStart)
            estadoStart = true;
            console.log('o estadoStart: ', estadoStart)
            socket.broadcast.emit('sincronizarStartOn');
            connectionEstado[1] = 'on';
            i = 0;
            loop();  
        });
        socket.on('luzOn', () => {
            console.log('luz ligada')
            socket.broadcast.emit('sincronizarLuzON');
            connectionEstado[0] = 'on';
        })
        socket.on('luzOff', () => {
            connectionEstado[0] = 'off';
            console.log('luz desligada')
            socket.broadcast.emit('sincronizarLuzOff');
            connectionEstado[0] = 'off';
        })
        //dado do cliente para o server
        socket.on('ValorLED', (event) => {
            alertaLuz = event.vLdr
            console.log(event.vLdr)
            io.emit('sincronizarLED', { LDR: alertaLuz })
        })
      });

    if (estadoStart == false) {
        console.log('motor.stop()')
        console.log("off");
        console.log('alerta.off();')
    }

    //#####################################################################################
    //############################# Funções do experimento ################################
    async function loop(){
        while(i < 25){
            //console.log("click start e a vetorDados i = " + i);

            //console.log("on");
            if (i == 0) {
                console.log("nova instancia de sensor");
            }
            
            await sendData();
            await sleep(2000);

        }
    }
    async function sleep(forHowLong) {
        function timeout(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(forHowLong);
    }
    async function iniciar() {

        await sleep(0);
        console.log('motor.forward(180)')
        await sleep(130);
        console.log('motor.stop()')
        await sleep(1000);
    }
    async function final() {
        await sleep(650);
        //console.log('motor.reverse(70)')
        await sleep(800); // era 900
        await sleep(100); // era 900
        //console.log('motor.stop()')
        await sleep(700);

        //console.log('motor.forward(70)')
        await sleep(600); // era 700 para ciclo de 25

        //console.log('motor.stop()')
        await sleep(0);

        //var a = 1;

        //console.log("Dentro de finalizar em  e f = f + 400000;");


        console.log("------------------FIM----------------");
        await sleep(500);
        estadoStart = false;
        console.log(estadoStart)
        await io.emit('sincronizarStartOff');
        await io.emit('sincronizarLuzOff');
        connectionEstado[1] = 'off';
        connectionEstado[0] = 'off';
        
        //return firebase.database().ref('iniciar/').set('off'), firebase.database().ref('luz/').set('off');
    }
    async function testeLuminosidade(alertaLuz) {
        if (luzPercentual < alertaLuz) {
            await sleep(0);
            alerta = true
            console.log("alerta ligado");
        }
        else {
            alerta = false
            console.log("alerta desligado");
        }
    }
    async function sendData() {
        await leituraDeDados();
        io.emit('data1', {
            serverNumero: vetorDados[0],
            serverTensao: vetorDados[1],
            serverResistencia: vetorDados[2],
            serverCorrente: vetorDados[3],
            serverLuz: vetorDados[4],
            serverLux: vetorDados[5]
        });

    }
    async function leituraDeDados () {
        var voltagem = (4.1 - (Math.random() * 0.5) - (i * 0.01))
        voltagem = voltagem.toFixed(2);
        luzPercentual = (95 - (Math.random() * 10) - (i * 3))
        luzPercentual = luzPercentual.toFixed(2);
        if (i <= ciclos - 1) {
            await testeLuminosidade(alertaLuz);
            await i++;
            await calcular(voltagem, luzPercentual);
            

        }
    }
    async function calcular(voltagem, luzPercentual){
        let resistencia;
        let corrente;
        let lux;
        let potencia;
        let exponencial;

        resistencia = ((5 - voltagem) / voltagem) * 10000;
        corrente = (voltagem / resistencia) * 1000;
        exponencial = (-1.505);
        potencia = Math.pow((resistencia / 1000), exponencial);
        lux = 2980 * potencia;

        
        vetorDados[0] = i
        vetorDados[1] = voltagem
        vetorDados[2] = parseFloat(resistencia.toFixed(2))
        vetorDados[3] = parseFloat(corrente.toFixed(2))
        vetorDados[4] = luzPercentual
        vetorDados[5] = parseFloat(lux.toFixed(2))
        console.log('ciclo: ' + vetorDados[0])

        await iniciar();

        if (i == (ciclos - 1)) {
            final();
        }
        return vetorDados;
    }
}

http.listen(4000, function () {
    console.log('Server rodando através da porta *:4000');
});
var express = require('express');
var app = express()
var http = require('http').createServer(app);
const io = require('socket.io')(http)


app.use(express.static(__dirname + "/public"));// chama o index.html
app.get('/fila', (req, res)=>{
    res.sendFile(__dirname + '/public/Esperar.html')
})
app.get('/bootstrap', (req, res)=>{
    res.sendFile(__dirname + '/public/ldr.html')
})

//############ corpo!!!!#############
{
  //########## variaveis da experimentação
    let alertaLuz = 30;
    let ciclos = 25;
    let luzPercentual
    let vetorDados = []
    let users =[]
    let connections = []
    let estadoStart = false;
    let connectionEstado = ['off', 'off']
    
    i = 0;
    f = 2000;

     //################################ Iniciar o experimento #################################
     io.on('connection', function(socket){
        if(connectionEstado[0] == 'on'){
            socket.emit('sincronizarLuzON');
        }else if (connectionEstado[0] == 'off'){
            socket.emit('sincronizarLuzOff');
        }
        if(connectionEstado[1] == 'on'){
            socket.emit('sincronizarStartOn');
            io.emit('sincronizarLED', { LDR: alertaLuz });
        }

        socket.on('ligar', () => {
            console.log('o estadoStart: ', estadoStart)
            estadoStart = true;
            console.log('o estadoStart: ', estadoStart)
            socket.broadcast.emit('sincronizarStartOn');
            connectionEstado[1] = 'on';
            i = 0;
            loop();  
        });
        socket.on('luzOn', () => {
            console.log('luz ligada')
            socket.broadcast.emit('sincronizarLuzON');
            connectionEstado[0] = 'on';
        })
        socket.on('luzOff', () => {
            connectionEstado[0] = 'off';
            console.log('luz desligada')
            socket.broadcast.emit('sincronizarLuzOff');
            connectionEstado[0] = 'off';
        })
        //dado do cliente para o server
        socket.on('ValorLED', (event) => {
            alertaLuz = event.vLdr
            console.log(event.vLdr)
            io.emit('sincronizarLED', { LDR: alertaLuz })
        })
      });

    if (estadoStart == false) {
        console.log('motor.stop()')
        console.log("off");
        console.log('alerta.off();')
    }

    //#####################################################################################
    //############################# Funções do experimento ################################
    async function loop(){
        while(i < 25){
            //console.log("click start e a vetorDados i = " + i);

            //console.log("on");
            if (i == 0) {
                console.log("nova instancia de sensor");
            }
            
            await sendData();
            await sleep(2000);

        }
    }
    async function sleep(forHowLong) {
        function timeout(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(forHowLong);
    }
    async function iniciar() {

        await sleep(0);
        console.log('motor.forward(180)')
        await sleep(130);
        console.log('motor.stop()')
        await sleep(1000);
    }
    async function final() {
        await sleep(650);
        //console.log('motor.reverse(70)')
        await sleep(800); // era 900
        await sleep(100); // era 900
        //console.log('motor.stop()')
        await sleep(700);

        //console.log('motor.forward(70)')
        await sleep(600); // era 700 para ciclo de 25

        //console.log('motor.stop()')
        await sleep(0);

        //var a = 1;

        //console.log("Dentro de finalizar em  e f = f + 400000;");


        console.log("------------------FIM----------------");
        await sleep(500);
        estadoStart = false;
        console.log(estadoStart)
        await io.emit('sincronizarStartOff');
        await io.emit('sincronizarLuzOff');
        connectionEstado[1] = 'off';
        connectionEstado[0] = 'off';
        
        //return firebase.database().ref('iniciar/').set('off'), firebase.database().ref('luz/').set('off');
    }
    async function testeLuminosidade(alertaLuz) {
        if (luzPercentual < alertaLuz) {
            await sleep(0);
            alerta = true
            console.log("alerta ligado");
        }
        else {
            alerta = false
            console.log("alerta desligado");
        }
    }
    async function sendData() {
        await leituraDeDados();
        io.emit('data1', {
            serverNumero: vetorDados[0],
            serverTensao: vetorDados[1],
            serverResistencia: vetorDados[2],
            serverCorrente: vetorDados[3],
            serverLuz: vetorDados[4],
            serverLux: vetorDados[5]
        });

    }
    async function leituraDeDados () {
        var voltagem = (4.1 - (Math.random() * 0.5) - (i * 0.01))
        voltagem = voltagem.toFixed(2);
        luzPercentual = (95 - (Math.random() * 10) - (i * 3))
        luzPercentual = luzPercentual.toFixed(2);
        if (i <= ciclos - 1) {
            await testeLuminosidade(alertaLuz);
            await i++;
            await calcular(voltagem, luzPercentual);
            

        }
    }
    async function calcular(voltagem, luzPercentual){
        let resistencia;
        let corrente;
        let lux;
        let potencia;
        let exponencial;

        resistencia = ((5 - voltagem) / voltagem) * 10000;
        corrente = (voltagem / resistencia) * 1000;
        exponencial = (-1.505);
        potencia = Math.pow((resistencia / 1000), exponencial);
        lux = 2980 * potencia;

        
        vetorDados[0] = i
        vetorDados[1] = voltagem
        vetorDados[2] = parseFloat(resistencia.toFixed(2))
        vetorDados[3] = parseFloat(corrente.toFixed(2))
        vetorDados[4] = luzPercentual
        vetorDados[5] = parseFloat(lux.toFixed(2))
        console.log('ciclo: ' + vetorDados[0])

        await iniciar();

        if (i == (ciclos - 1)) {
            final();
        }
        return vetorDados;
    }
}

http.listen(8000, function () {
    console.log('Server rodando através da porta *:8000');
});

