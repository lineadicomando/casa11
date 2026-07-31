# Reverse proxy e log

Configurazione del server web davanti all'applicazione, e in particolare del
suo registro degli accessi. Non è una nota operativa fra le altre: è ciò che
rende vera l'informativa pubblicata su `/privacy`.

## Il problema

Il tema natale è servito da una richiesta GET con i parametri nell'indirizzo:

```
GET /api/chart?date=1968-03-12&time=14:30&locationId=3172394
```

È una scelta deliberata — un tema è una funzione pura dei suoi parametri,
quindi l'URL è condivisibile e la risposta memorizzabile — ma ha una
conseguenza. Il formato di log predefinito di nginx (`combined`) registra
`$request`, cioè la riga di richiesta **completa di query string**, accanto
all'indirizzo IP del client:

```
203.0.113.7 - - [12/Mar/2026:14:30:01 +0100] "GET /api/chart?date=1968-03-12&time=14:30&… HTTP/1.1" 200 …
```

Quella riga è l'unico punto dell'intero sistema in cui data, ora e luogo di
nascita di qualcuno finiscono nello stesso record di un identificativo che lo
riguarda. L'applicazione non conserva nulla; il log predefinito del server
davanti a lei conserva tutto. Va corretto lì.

La cura è togliere la query string dal formato di log — non l'intero log, che
serve a diagnosticare i guasti e a difendersi dagli abusi. `$uri` è il percorso
già normalizzato, senza parametri.

## nginx

```nginx
# Formato di log senza query string: `$uri` al posto di `$request`.
# Restano metodo, percorso, esito e provenienza — tutto ciò che serve a
# capire cosa non funziona — e sparisce ciò che non deve essere conservato.
log_format senza_query '$remote_addr - $remote_user [$time_local] '
                       '"$request_method $uri $server_protocol" '
                       '$status $body_bytes_sent '
                       '"$http_referer" "$http_user_agent"';

server {
    server_name esempio.it;

    access_log /var/log/nginx/undicesimacasa.log senza_query;
    error_log  /var/log/nginx/undicesimacasa.error.log warn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Attenzione anche a `$http_referer`: se un giorno l'applicazione producesse
collegamenti fra pagine con i parametri di nascita nell'indirizzo, il referer
li riporterebbe dentro. Oggi non accade — la richiesta parte da JavaScript e
il referer è la pagina, non l'API — ma è il posto da ricontrollare se cambia
la navigazione.

### Rotazione

L'informativa dichiara **sette giorni** di conservazione. Va reso vero:

```
# /etc/logrotate.d/undicesimacasa
/var/log/nginx/undicesimacasa*.log {
    daily
    rotate 7
    missingok
    notifempty
    compress
    delaycompress
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 $(cat /var/run/nginx.pid)
    endscript
}
```

Cambiando `rotate` va cambiata la cifra in
`apps/web/src/routes/(informativa)/privacy/+page.svelte` (`RITENZIONE_LOG`), e
viceversa: sono lo stesso numero detto in due posti.

## Caddy

Caddy registra la richiesta in JSON e include `uri` con la query string. Il
filtro `query` la sostituisce campo per campo; `delete` la toglie del tutto:

```caddyfile
esempio.it {
    reverse_proxy 127.0.0.1:3000

    log {
        output file /var/log/caddy/undicesimacasa.log {
            roll_size 10MiB
            roll_keep_for 168h   # sette giorni, come dichiarato nell'informativa
        }
        format filter {
            wrap json
            fields {
                uri query {
                    delete date
                    delete time
                    delete latitude
                    delete longitude
                    delete locationId
                }
            }
        }
    }
}
```

Caddy ruota da sé: `roll_keep_for` sostituisce logrotate.

## Verifica

Dopo aver applicato la configurazione, calcolare un tema dall'interfaccia e
controllare che nel log non compaia nessun parametro:

```sh
grep -c 'date=' /var/log/nginx/undicesimacasa.log   # atteso: 0
```

Un valore diverso da zero significa che l'informativa sta dicendo una cosa e
il server ne sta facendo un'altra.

## Cosa resta scoperto

- **La cronologia del browser** di chi usa il sito conserva gli indirizzi con i
  parametri. È sul suo dispositivo e sotto il suo controllo; l'informativa lo
  dice esplicitamente.
- **Il log degli errori** di nginx può riportare l'URI completo in caso di
  guasto. Tenerlo a `warn` limita il caso alle anomalie vere, che sono
  esattamente quelle in cui l'indirizzo serve.
