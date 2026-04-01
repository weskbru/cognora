"""
Testes unitários — Hash e verificação de senhas (bcrypt).
Cobre: hash_password, verify_password
"""
import pytest
from core.security.password import hash_password, verify_password


class TestHashPassword:
    def test_hash_e_diferente_da_senha_original(self):
        plain = "minha_senha_secreta"
        assert hash_password(plain) != plain

    def test_hash_comeca_com_prefixo_bcrypt(self):
        hashed = hash_password("qualquer_senha")
        assert hashed.startswith("$2b$")

    def test_hashes_diferentes_para_mesma_senha(self):
        """bcrypt usa salt aleatório — dois hashes nunca são iguais."""
        senha = "mesma_senha"
        assert hash_password(senha) != hash_password(senha)

    def test_hash_de_senha_vazia(self):
        hashed = hash_password("")
        assert isinstance(hashed, str)
        assert hashed.startswith("$2b$")

    def test_hash_de_senha_no_limite_bcrypt(self):
        """bcrypt aceita até 72 bytes — testa exatamente nesse limite."""
        longa = "x" * 72
        hashed = hash_password(longa)
        assert isinstance(hashed, str)
        assert hashed.startswith("$2b$")


class TestVerifyPassword:
    def test_senha_correta_retorna_true(self):
        plain = "senha_certa_123"
        assert verify_password(plain, hash_password(plain)) is True

    def test_senha_errada_retorna_false(self):
        hashed = hash_password("senha_certa")
        assert verify_password("senha_errada", hashed) is False

    def test_string_vazia_contra_hash_real_retorna_false(self):
        hashed = hash_password("alguma_senha")
        assert verify_password("", hashed) is False

    def test_senha_vazia_contra_hash_de_vazia_retorna_true(self):
        hashed = hash_password("")
        assert verify_password("", hashed) is True

    def test_maiusculas_e_minusculas_importam(self):
        hashed = hash_password("Senha")
        assert verify_password("senha", hashed) is False
        assert verify_password("SENHA", hashed) is False

    def test_espacos_importam(self):
        hashed = hash_password("senha com espaço")
        assert verify_password("senha com espaco", hashed) is False
        assert verify_password("senha com espaço", hashed) is True
