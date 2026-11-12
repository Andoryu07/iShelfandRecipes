import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def main() -> None:
    privateKey = ec.generate_private_key(ec.SECP256R1())
    privateRaw = privateKey.private_numbers().private_value.to_bytes(32, "big")
    publicRaw = privateKey.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    print("Add these lines to .env:")
    print(f"VAPID_PUBLIC_KEY={encode(publicRaw)}")
    print(f"VAPID_PRIVATE_KEY={encode(privateRaw)}")


if __name__ == "__main__":
    main()
