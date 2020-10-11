package main

import "C"

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
)

func main() {

}

//export encryptTrackKey
func encryptTrackKey(otherPublicKeyBytes []byte, trackKey []byte) ([]byte, error) {
	curve := elliptic.P256()

	ephemeraPrivateKey, err := ecdsa.GenerateKey(curve, rand.Reader)

	if err != nil {
		return nil, err
	}

	ephemeralPublicKey := elliptic.Marshal(curve, ephemeraPrivateKey.X, ephemeraPrivateKey.Y)

	otherPublicKeyX, otherPublicKeyY := elliptic.Unmarshal(curve, otherPublicKeyBytes)

	// ECDH
	x, _ := curve.ScalarMult(otherPublicKeyX, otherPublicKeyY, ephemeraPrivateKey.D.Bytes())
	shared_key := x.Bytes()

	// X963 KDF
	length := 32
	output := make([]byte, 0)
	outlen := 0
	counter := uint32(1)

	for outlen < length {
		h := sha256.New()
		h.Write(shared_key) // Key Material: ECDH Key

		counterBuf := make([]byte, 4)
		binary.BigEndian.PutUint32(counterBuf, counter)
		h.Write(counterBuf)

		h.Write(ephemeralPublicKey) // Shared Info: Our public key

		output = h.Sum(output)
		outlen += h.Size()
		counter += 1
	}

	// Key
	encryptionKey := output[0:16]
	iv := output[16:]

	// AES
	block, _ := aes.NewCipher(encryptionKey)
	aesgcm, _ := cipher.NewGCMWithNonceSize(block, 16)

	ct := aesgcm.Seal(nil, iv, trackKey, nil)

	return append(ephemeralPublicKey, ct...), nil
}
