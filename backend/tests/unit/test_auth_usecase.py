from unittest.mock import MagicMock

from core.security.password import hash_password
from domain.use_cases.auth import AuthUseCases


def _make_use_case(existing_user=None):
    repo = MagicMock()
    repo.get_by_email.return_value = existing_user
    repo.get_by_username.return_value = None
    repo.get_by_identifier.return_value = existing_user
    return AuthUseCases(repo), repo


class TestRegister:
    def test_novo_usuario_retorna_token_sem_erro(self):
        uc, repo = _make_use_case(existing_user=None)
        fake_user = MagicMock()
        fake_user.email = "novo@cognora.com"
        fake_user.username = "novo"
        repo.create.return_value = fake_user

        result, error = uc.register("novo@cognora.com", "senha123")

        assert error is None
        assert result["access_token"] is not None
        assert result["token_type"] == "bearer"
        assert result["email"] == "novo@cognora.com"

    def test_email_ja_cadastrado_retorna_erro(self):
        existing = MagicMock()
        existing.email = "existente@cognora.com"
        uc, repo = _make_use_case(existing_user=existing)

        result, error = uc.register("existente@cognora.com", "senha")

        assert result is None
        assert error is not None
        assert "cadastrado" in error.lower()
        repo.create.assert_not_called()

    def test_token_retornado_e_valido(self):
        from core.security.jwt import decode_token

        uc, repo = _make_use_case(existing_user=None)
        fake_user = MagicMock()
        fake_user.email = "valido@cognora.com"
        fake_user.username = "valido"
        repo.create.return_value = fake_user

        result, _ = uc.register("valido@cognora.com", "senha")

        assert decode_token(result["access_token"]) == "valido@cognora.com"

    def test_repositorio_create_e_chamado_com_senha_hasheada(self):
        uc, repo = _make_use_case(existing_user=None)
        fake_user = MagicMock()
        fake_user.email = "hash@cognora.com"
        fake_user.username = "hash"
        repo.create.return_value = fake_user

        uc.register("hash@cognora.com", "senha_plain")

        email_arg, hash_arg = repo.create.call_args[0][:2]
        assert email_arg == "hash@cognora.com"
        assert hash_arg != "senha_plain"
        assert hash_arg.startswith("$2b$")


class TestLogin:
    def test_credenciais_validas_retornam_token(self):
        user = MagicMock()
        user.email = "user@cognora.com"
        user.username = "user"
        user.hashed_password = hash_password("senha123")
        uc, _ = _make_use_case(existing_user=user)

        result, error = uc.login("user@cognora.com", "senha123")

        assert error is None
        assert result["access_token"] is not None
        assert result["email"] == "user@cognora.com"

    def test_senha_errada_retorna_erro(self):
        user = MagicMock()
        user.email = "user@cognora.com"
        user.hashed_password = hash_password("senha_certa")
        uc, _ = _make_use_case(existing_user=user)

        result, error = uc.login("user@cognora.com", "senha_errada")

        assert result is None
        assert error is not None

    def test_email_inexistente_retorna_erro(self):
        uc, _ = _make_use_case(existing_user=None)

        result, error = uc.login("nao_existe@cognora.com", "qualquer")

        assert result is None
        assert error is not None

    def test_mensagem_de_erro_nao_expoe_qual_campo_esta_errado(self):
        uc, _ = _make_use_case(existing_user=None)

        _, error = uc.login("x@x.com", "y")

        assert error == "Credenciais invalidas"

    def test_token_valido_apos_login_bem_sucedido(self):
        from core.security.jwt import decode_token

        user = MagicMock()
        user.email = "login@cognora.com"
        user.username = "login"
        user.hashed_password = hash_password("abc123")
        uc, _ = _make_use_case(existing_user=user)

        result, _ = uc.login("login@cognora.com", "abc123")

        assert decode_token(result["access_token"]) == "login@cognora.com"
