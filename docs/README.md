# Documentazione

Il [README](../README.md) racconta il progetto per intero: perché le cose sono
come sono, e che cosa succede in ogni superficie. Qui ci sono i riferimenti
essenziali — parametri, valori, difetti — per chi il progetto lo ha già capito e
deve solo chiamarlo.

| | |
|---|---|
| [api.md](api.md) | i nove endpoint HTTP, con i prompt brevi per un agente |
| [mcp.md](mcp.md) | gli otto tool MCP e le due risorse di riferimento |
| [cli.md](cli.md) | la riga di comando `casa11` |
| [prompt-lettura.md](prompt-lettura.md) | il prompt di sistema completo per un agente che legge il tema |
| [proxy-e-log.md](proxy-e-log.md) | reverse proxy e log: ciò che rende vera l'informativa su `/privacy` |

Le tre superfici espongono lo stesso motore e non si sostituiscono a vicenda:
l'API serve chi ha una rete davanti, l'MCP chi ha un agente, la CLI chi ha un
terminale. Nessuna delle tre interpreta — `core` produce dati verificabili, il
significato è responsabilità di chi consuma.
