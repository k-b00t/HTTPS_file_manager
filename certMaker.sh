#!/bin/bash

apt update
apt -y install openssl shred
clear
mkdir certificate
openssl genrsa -des3 -passout pass:SuperUnbreakablePass -out certificate/keypair 2048
openssl rsa -passin pass:SuperUnbreakablePass -in certificate/keypair -out certificate/key
shred -u certificate/keypair
openssl req -new -key certificate/key -out certificate/csr
oshred -u certificate/csr
penssl x509 -req -days 365 -in certificate/csr -signkey certificate/key -out certificate/crt
