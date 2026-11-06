# Bancada de precisão do Professor Virtual

Gerado por `node --import tsx tools/bancada-professor-virtual/rodar.ts --repeticoes 1`. 1560 tentativas na matriz, em 10.0 min.
Áudio 100% sintético: isto é um teto otimista, não a precisão em quarto real.

Cada célula traz acerto, (acertos/total; intervalo de confiança de Wilson a 95%). As tentativas de um mesmo caso não são independentes, então o intervalo real é mais largo.

## Geral

- Tocou certo e foi aprovado: 95.4% (269/282; IC 92.3%-97.3%)
- Tocou errado e foi recusado: 90.9% (1162/1278; IC 89.2%-92.4%)
- Tocou errado e foi recusado, sem contar oitava no violão (aceita de propósito): 99.8% (1162/1164; IC 99.4%-100.0%)

## Matriz principal (configuração padrão do motor)

"Tocou certo": o que falta para 100% é falso negativo. "Tocou errado": o que falta para 100% é falso positivo.

| Instrumento | Tipo | Situação | SNR 30 dB | SNR 20 dB | SNR 10 dB |
| --- | --- | --- | --- | --- | --- |
| Violão | nota | tocou certo (aprovar) | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) |
| Violão | nota | tocou errado (recusar) | 77.4% (130/168; IC 70.5%-83.1%) | 77.4% (130/168; IC 70.5%-83.1%) | 77.4% (130/168; IC 70.5%-83.1%) |
| Violão | acorde | tocou certo (aprovar) | 92.9% (13/14; IC 68.5%-98.7%) | 92.9% (13/14; IC 68.5%-98.7%) | 85.7% (12/14; IC 60.1%-96.0%) |
| Violão | acorde | tocou errado (recusar) | 100.0% (44/44; IC 92.0%-100.0%) | 100.0% (44/44; IC 92.0%-100.0%) | 100.0% (44/44; IC 92.0%-100.0%) |
| Teclado | nota | tocou certo (aprovar) | 100.0% (28/28; IC 87.9%-100.0%) | 100.0% (28/28; IC 87.9%-100.0%) | 100.0% (28/28; IC 87.9%-100.0%) |
| Teclado | nota | tocou errado (recusar) | 100.0% (154/154; IC 97.6%-100.0%) | 100.0% (154/154; IC 97.6%-100.0%) | 100.0% (154/154; IC 97.6%-100.0%) |
| Teclado | acorde | tocou certo (aprovar) | 96.2% (25/26; IC 81.1%-99.3%) | 96.2% (25/26; IC 81.1%-99.3%) | 73.1% (19/26; IC 53.9%-86.3%) |
| Teclado | acorde | tocou errado (recusar) | 98.3% (59/60; IC 91.1%-99.7%) | 98.3% (59/60; IC 91.1%-99.7%) | 100.0% (60/60; IC 94.0%-100.0%) |

## Recusa por tipo de erro

| Instrumento | Erro do aluno | SNR 30 dB | SNR 20 dB | SNR 10 dB |
| --- | --- | --- | --- | --- |
| Violão | semitom | 100.0% (50/50; IC 92.9%-100.0%) | 100.0% (50/50; IC 92.9%-100.0%) | 100.0% (50/50; IC 92.9%-100.0%) |
| Violão | tom | 100.0% (50/50; IC 92.9%-100.0%) | 100.0% (50/50; IC 92.9%-100.0%) | 100.0% (50/50; IC 92.9%-100.0%) |
| Violão | oitava | 0.0% (0/38; IC 0.0%-9.2%) | 0.0% (0/38; IC 0.0%-9.2%) | 0.0% (0/38; IC 0.0%-9.2%) |
| Violão | corda-vizinha | 100.0% (20/20; IC 83.9%-100.0%) | 100.0% (20/20; IC 83.9%-100.0%) | 100.0% (20/20; IC 83.9%-100.0%) |
| Violão | sala-em-silencio | 100.0% (16/16; IC 80.6%-100.0%) | 100.0% (16/16; IC 80.6%-100.0%) | 100.0% (16/16; IC 80.6%-100.0%) |
| Violão | nota-no-lugar-do-acorde | 100.0% (14/14; IC 78.5%-100.0%) | 100.0% (14/14; IC 78.5%-100.0%) | 100.0% (14/14; IC 78.5%-100.0%) |
| Violão | acorde-parecido | 100.0% (24/24; IC 86.2%-100.0%) | 100.0% (24/24; IC 86.2%-100.0%) | 100.0% (24/24; IC 86.2%-100.0%) |
| Teclado | semitom | 100.0% (52/52; IC 93.1%-100.0%) | 100.0% (52/52; IC 93.1%-100.0%) | 100.0% (52/52; IC 93.1%-100.0%) |
| Teclado | tom | 100.0% (52/52; IC 93.1%-100.0%) | 100.0% (52/52; IC 93.1%-100.0%) | 100.0% (52/52; IC 93.1%-100.0%) |
| Teclado | oitava | 100.0% (40/40; IC 91.2%-100.0%) | 100.0% (40/40; IC 91.2%-100.0%) | 100.0% (40/40; IC 91.2%-100.0%) |
| Teclado | sala-em-silencio | 100.0% (16/16; IC 80.6%-100.0%) | 100.0% (16/16; IC 80.6%-100.0%) | 100.0% (16/16; IC 80.6%-100.0%) |
| Teclado | nota-no-lugar-do-acorde | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) |
| Teclado | acorde-parecido | 96.4% (27/28; IC 82.3%-99.4%) | 96.4% (27/28; IC 82.3%-99.4%) | 100.0% (28/28; IC 87.9%-100.0%) |

## Como a falha aparece nos casos certos

| Instrumento | Tipo | n | Aprovou de primeira | Reprovou e depois aprovou | Só reprovou | Sem resposta |
| --- | --- | --- | --- | --- | --- | --- |
| Violão | nota | 78 | 78 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| Violão | acorde | 42 | 37 (88.1%) | 1 (2.4%) | 4 (9.5%) | 0 (0.0%) |
| Teclado | nota | 84 | 84 (100.0%) | 0 (0.0%) | 0 (0.0%) | 0 (0.0%) |
| Teclado | acorde | 78 | 69 (88.5%) | 0 (0.0%) | 9 (11.5%) | 0 (0.0%) |

## Oitava no violão

| Configuração | Situação | SNR 30 dB | SNR 20 dB | SNR 10 dB |
| --- | --- | --- | --- | --- |
| padrão (aceitarOitava: true) | nota certa | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) |
| padrão (aceitarOitava: true) | oitava errada | 0.0% (0/38; IC 0.0%-9.2%) | 0.0% (0/38; IC 0.0%-9.2%) | 0.0% (0/38; IC 0.0%-9.2%) |
| padrão (aceitarOitava: true) | Mi2 (corda solta 6) certo | 100.0% (2/2; IC 34.2%-100.0%) | 100.0% (2/2; IC 34.2%-100.0%) | 100.0% (2/2; IC 34.2%-100.0%) |
| exata (aceitarOitava: false) | nota certa | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) | 100.0% (26/26; IC 87.1%-100.0%) |
| exata (aceitarOitava: false) | oitava errada | 100.0% (38/38; IC 90.8%-100.0%) | 100.0% (38/38; IC 90.8%-100.0%) | 100.0% (38/38; IC 90.8%-100.0%) |
| exata (aceitarOitava: false) | Mi2 (corda solta 6) certo | 100.0% (2/2; IC 34.2%-100.0%) | 100.0% (2/2; IC 34.2%-100.0%) | 100.0% (2/2; IC 34.2%-100.0%) |

## Pior caso

| Caso | Acerto | Falhas por SNR (30/20/10) | Exemplo para reproduzir | Última mensagem |
| --- | --- | --- | --- | --- |
| violao pede Dó3, toca Dó4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 1491326352 | Boa, é Dó! Só que soou uma oitava acima da pedida. |
| violao pede Dó4, toca Dó3 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 375592408 | Boa, é Dó! Só que soou uma oitava abaixo da pedida. |
| violao pede Dó4, toca Dó5 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 162986186 | Boa, é Dó! Só que soou uma oitava acima da pedida. |
| violao pede Dó5, toca Dó4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 1606161810 | Boa, é Dó! Só que soou uma oitava abaixo da pedida. |
| violao pede Lá2, toca Lá3 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 3111618058 | Boa, é Lá! Só que soou uma oitava acima da pedida. |
| violao pede Lá3, toca Lá2 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 2539982038 | Boa, é Lá! Só que soou uma oitava abaixo da pedida. |
| violao pede Lá3, toca Lá4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 2444405100 | Boa, é Lá! Só que soou uma oitava acima da pedida. |
| violao pede Mi2, toca Mi3 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 3297857238 | Boa, é Mi! Só que soou uma oitava acima da pedida. |
| violao pede Mi3, toca Mi2 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 1429142290 | Boa, é Mi! Só que soou uma oitava abaixo da pedida. |
| violao pede Mi3, toca Mi4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 851329056 | Boa, é Mi! Só que soou uma oitava acima da pedida. |
| violao pede Mi4, toca Mi3 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 2448857636 | Boa, é Mi! Só que soou uma oitava abaixo da pedida. |
| violao pede Mi4, toca Mi5 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 2922311630 | Boa, é Mi! Só que soou uma oitava acima da pedida. |
| violao pede Ré3, toca Ré4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 3765356324 | Boa, é Ré! Só que soou uma oitava acima da pedida. |
| violao pede Si3, toca Si2 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -18 dBFS, semente 1745816362 | Boa, é Si! Só que soou uma oitava abaixo da pedida. |
| violao pede Si3, toca Si4 (oitava) | 0.0% (0/6) | 2/2/2 | sr 44100, SNR 30, nível -6 dBFS, semente 3181176760 | Boa, é Si! Só que soou uma oitava acima da pedida. |

## Tempo até aprovar (a partir do início do toque)

| Instrumento | Tipo | Mediana | P90 |
| --- | --- | --- | --- |
| Violão | nota | 117 ms | 139 ms |
| Violão | acorde | 387 ms | 413 ms |
| Teclado | nota | 129 ms | 152 ms |
| Teclado | acorde | 389 ms | 419 ms |

## Sequências (várias notas seguidas)

Certo = o seguidor terminou exatamente no passo indicado; nos casos de ressonância, também sem reprovação anterior.

| Sequência | Passo final certo | SNR 30 dB | SNR 20 dB | SNR 10 dB |
| --- | --- | --- | --- | --- |
| violão: semicolcheias 100 BPM (150 ms/nota) | 4 | 1/6 (passos: 1,1,4,2,1,1) | 1/6 (passos: 2,4,2,1,1,2) | 2/6 (passos: 4,1,1,1,2,4) |
| violão: semicolcheias 120 BPM (125 ms/nota) | 4 | 0/6 (passos: 2,1,2,1,1,2) | 1/6 (passos: 1,1,2,2,4,2) | 0/6 (passos: 2,1,1,1,1,1) |
| violão: semicolcheias 140 BPM (107 ms/nota) | 4 | 0/6 (passos: 2,1,2,2,1,2) | 0/6 (passos: 1,1,2,1,2,1) | 0/6 (passos: 2,1,1,1,1,1) |
| violão: 6 cordas soltas em ordem, deixando soar | 6 | 6/6 (passos: 6,6,6,6,6,6) | 6/6 (passos: 6,6,6,6,6,6) | 5/6 (passos: 1,6,6,6,6,6) |
| violão: Dó maior na 1ª posição | 8 | 6/6 (passos: 8,8,8,8,8,8) | 6/6 (passos: 8,8,8,8,8,8) | 6/6 (passos: 8,8,8,8,8,8) |
| violão: mesma nota 3 vezes | 3 | 6/6 (passos: 3,3,3,3,3,3) | 6/6 (passos: 3,3,3,3,3,3) | 5/6 (passos: 3,3,3,3,2,3) |
| violão: C G Am Em | 4 | 5/6 (passos: 4,4,4,4,1,4) | 5/6 (passos: 4,2,4,4,4,4) | 4/6 (passos: 4,4,4,2,4,2) |
| violão: mesmo acorde 2 vezes | 2 | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) | 3/6 (passos: 2,1,2,1,2,1) |
| teclado: Dó maior | 8 | 6/6 (passos: 8,8,8,8,8,8) | 6/6 (passos: 8,8,8,8,8,8) | 5/6 (passos: 8,8,8,4,8,8) |
| teclado: mesma nota 3 vezes | 3 | 1/6 (passos: 1,3,1,1,2,1) | 0/6 (passos: 1,1,1,2,1,1) | 0/6 (passos: 1,2,1,1,1,1) |
| teclado: C F G Am | 4 | 3/6 (passos: 4,3,4,2,3,4) | 1/6 (passos: 4,3,2,2,1,2) | 1/6 (passos: 4,0,1,0,1,0) |
| violão: pede Mi 2 vezes, toca 1 vez | 1 | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) |
| violão: pede G 2 vezes, toca 1 vez | 1 | 6/6 (passos: 1,1,1,1,1,1) | 5/6 (passos: 1,0,1,1,1,1) | 5/6 (passos: 1,1,1,1,0,1) |
| teclado: pede Dó 2 vezes, toca 1 vez | 1 | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) |
| teclado: pede C 2 vezes, toca 1 vez | 1 | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) | 2/6 (passos: 0,0,0,1,0,1) |
| violão: Mi, Lá pedidos; toca Mi e Fá | 1 | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) |
| teclado: C, Am pedidos; toca C e Em | 1 | 6/6 (passos: 1,1,1,1,1,1) | 6/6 (passos: 1,1,1,1,1,1) | 3/6 (passos: 0,1,0,1,0,1) |
| violão: Lá novo com Mi anterior a -6 dB | 2 | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) |
| violão: Lá novo com Mi anterior a -12 dB | 2 | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) |
| violão: corda Mi solta ressoa por simpatia | 2 | 6/6 (passos: 2,2,2,2,2,2) | 6/6 (passos: 2,2,2,2,2,2) | 5/6 (passos: 2,2,2,1,2,2) |

## Estresse (fora da matriz)

| Condição (SNR 20 dB) | Acerto |
| --- | --- |
| Violão aço/palheta: nota certa | 100.0% (26/26; IC 87.1%-100.0%) |
| Violão aço/palheta: acorde certo | 78.6% (11/14; IC 52.4%-92.4%) |
| Violão aço/palheta: semitom errado (acerto = recusou) | 100.0% (50/50; IC 92.9%-100.0%) |
| Violão aço/palheta: acorde parecido (acerto = recusou) | 100.0% (24/24; IC 86.2%-100.0%) |
| Violão nota certa, instrumento 25 cents agudo | 100.0% (26/26; IC 87.1%-100.0%) |
| Violão nota certa, instrumento 35 cents grave | 100.0% (26/26; IC 87.1%-100.0%) |
| Violão acorde certo, instrumento 25 cents agudo | 71.4% (10/14; IC 45.4%-88.3%) |
| Violão acorde certo, instrumento 35 cents grave | 85.7% (12/14; IC 60.1%-96.0%) |
| Violão acorde certo, strum lento (80 ms) | 57.1% (8/14; IC 32.6%-78.6%) |
| Violão acorde certo, toque fraco | 85.7% (12/14; IC 60.1%-96.0%) |
| Violão acorde com uma corda do meio abafada | 71.4% (10/14; IC 45.4%-88.3%) |
| Violão acorde sem a corda mais grave | 92.9% (13/14; IC 68.5%-98.7%) |
| Violão nota certa, celular longe (pico -36 dBFS) | 100.0% (26/26; IC 87.1%-100.0%) |
| Violão acorde certo, celular longe (pico -36 dBFS) | 85.7% (12/14; IC 60.1%-96.0%) |
| Teclado nota certa, celular longe (pico -36 dBFS) | 100.0% (28/28; IC 87.9%-100.0%) |
| Teclado acorde certo, celular longe (pico -36 dBFS) | 96.2% (25/26; IC 81.1%-99.3%) |

<!-- análise manual: o texto abaixo é preservado entre rodadas -->

Nesta execução, os três casos de semicolcheias foram medidos antes do ajuste posterior no seguidor (em exercícios com BPM >= 100, espera após ataque de 50 para 20 ms e detecção de troca de nota sem novo ataque). O resultado acima é a linha de base; a precisão e a recusa de erros desse modo rápido ainda não foram medidas pela bancada completa. Os exercícios sem BPM rápido preservam os parâmetros medidos acima.

A primeira rodada usou os parâmetros atuais do detector. Na segunda, o limiar de ataque foi reduzido de 6 para 5 dB e a margem do pico de 1 para 0 dB; a matriz principal permaneceu igual e a repetição da mesma nota no teclado continuou em 1/6, 0/6 e 0/6. A mudança foi revertida. A tabela acima corresponde à segunda rodada; os resultados das sequências podem variar um passo em alguns casos em relação à primeira.
