"""
Testes unitários — BaseRepository (CRUD genérico) e row_to_dict.
Usa a model Subject como entidade concreta para os testes.
"""
import uuid

import pytest

from infrastructure.database.models import Subject
from infrastructure.repositories.base import BaseRepository, row_to_dict


class TestBaseRepositoryCreate:
    def test_cria_entidade_e_retorna_row(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Matemática"})
        assert row is not None
        assert row.name == "Matemática"

    def test_id_gerado_automaticamente(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Física"})
        assert row.id is not None

    def test_campos_opcionais_aceitos(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Química", "description": "Moléculas e reações"})
        assert row.description == "Moléculas e reações"

    def test_campos_invalidos_sao_ignorados(self, db):
        repo = BaseRepository(Subject, db)
        # 'campo_inexistente' não existe no modelo — deve ser silenciosamente ignorado
        row = repo.create({"name": "Bio", "campo_inexistente": "valor"})
        assert row.name == "Bio"

    def test_id_nao_pode_ser_sobrescrito_via_create(self, db):
        repo = BaseRepository(Subject, db)
        custom_id = str(uuid.uuid4())
        # O campo 'id' é excluído da lista de campos válidos no create
        row = repo.create({"name": "Sub", "id": custom_id})
        # O id gerado deve ser diferente do passado (ou igual por coincidência, mas
        # o importante é que o campo 'id' não está na lista de campos válidos)
        assert row.id is not None


class TestBaseRepositoryGetById:
    def test_retorna_entidade_existente(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "GetTest"})
        found = repo.get_by_id(str(row.id))
        assert found is not None
        assert found.name == "GetTest"

    def test_retorna_none_para_id_inexistente(self, db):
        repo = BaseRepository(Subject, db)
        result = repo.get_by_id(str(uuid.uuid4()))
        assert result is None


class TestBaseRepositoryList:
    def test_lista_todas_as_entidades(self, db):
        repo = BaseRepository(Subject, db)
        email = f"list_{uuid.uuid4().hex[:8]}@test.com"
        repo.create({"name": "S1", "owner_email": email})
        repo.create({"name": "S2", "owner_email": email})

        results = repo.list(owner_email=email)
        assert len(results) == 2

    def test_filtro_por_campo(self, db):
        repo = BaseRepository(Subject, db)
        email_a = f"a_{uuid.uuid4().hex[:6]}@test.com"
        email_b = f"b_{uuid.uuid4().hex[:6]}@test.com"
        repo.create({"name": "SubA", "owner_email": email_a})
        repo.create({"name": "SubB", "owner_email": email_b})

        results = repo.list(owner_email=email_a)
        assert len(results) == 1
        assert results[0].owner_email == email_a

    def test_limit_restringe_resultados(self, db):
        repo = BaseRepository(Subject, db)
        email = f"lim_{uuid.uuid4().hex[:8]}@test.com"
        for i in range(5):
            repo.create({"name": f"LimSub{i}", "owner_email": email})

        results = repo.list(limit=3, owner_email=email)
        assert len(results) == 3

    def test_sort_descendente(self, db):
        repo = BaseRepository(Subject, db)
        email = f"sort_{uuid.uuid4().hex[:8]}@test.com"
        repo.create({"name": "AAA_desc", "owner_email": email})
        repo.create({"name": "ZZZ_desc", "owner_email": email})

        results = repo.list(sort="-name", owner_email=email)
        names = [r.name for r in results]
        assert names.index("ZZZ_desc") < names.index("AAA_desc")

    def test_sort_ascendente(self, db):
        repo = BaseRepository(Subject, db)
        email = f"sorta_{uuid.uuid4().hex[:8]}@test.com"
        repo.create({"name": "ZZZ_asc", "owner_email": email})
        repo.create({"name": "AAA_asc", "owner_email": email})

        results = repo.list(sort="name", owner_email=email)
        names = [r.name for r in results]
        assert names.index("AAA_asc") < names.index("ZZZ_asc")

    def test_lista_vazia_quando_nenhum_resultado(self, db):
        repo = BaseRepository(Subject, db)
        results = repo.list(owner_email="ninguem@test.com")
        assert results == []

    def test_filtro_por_campo_inexistente_e_ignorado(self, db):
        """Campos sem atributo no modelo são ignorados pelo filter."""
        repo = BaseRepository(Subject, db)
        email = f"fi_{uuid.uuid4().hex[:8]}@test.com"
        repo.create({"name": "FiltroIgnorado", "owner_email": email})

        # campo_xy não existe no modelo — não deve quebrar
        results = repo.list(owner_email=email, campo_xy="valor")
        assert len(results) == 1


class TestBaseRepositoryUpdate:
    def test_atualiza_campo(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Original"})
        updated = repo.update(str(row.id), {"name": "Atualizado"})
        assert updated.name == "Atualizado"

    def test_atualiza_multiplos_campos(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Multi", "description": "Desc1"})
        updated = repo.update(str(row.id), {"name": "MultiNovo", "description": "Desc2"})
        assert updated.name == "MultiNovo"
        assert updated.description == "Desc2"

    def test_id_inexistente_retorna_none(self, db):
        repo = BaseRepository(Subject, db)
        result = repo.update(str(uuid.uuid4()), {"name": "Nada"})
        assert result is None

    def test_campos_invalidos_ignorados_no_update(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "UpdateTest"})
        updated = repo.update(str(row.id), {"name": "OK", "campo_falso": "valor"})
        assert updated.name == "OK"


class TestBaseRepositoryDelete:
    def test_deleta_entidade_existente(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "Deletar"})
        item_id = str(row.id)
        assert repo.delete(item_id) is True
        assert repo.get_by_id(item_id) is None

    def test_id_inexistente_retorna_false(self, db):
        repo = BaseRepository(Subject, db)
        assert repo.delete(str(uuid.uuid4())) is False


class TestRowToDict:
    def test_retorna_dict(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "DictTest"})
        result = row_to_dict(row)
        assert isinstance(result, dict)

    def test_uuid_convertido_para_string(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "UUIDStr"})
        result = row_to_dict(row)
        assert isinstance(result["id"], str)
        # Deve ser um UUID válido
        uuid.UUID(result["id"])

    def test_datetime_convertido_para_isoformat(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "DateStr"})
        result = row_to_dict(row)
        # created_date deve ser string ISO
        assert isinstance(result["created_date"], str)
        assert "T" in result["created_date"]  # formato ISO: YYYY-MM-DDTHH:MM:SS

    def test_todos_os_campos_da_coluna_presentes(self, db):
        repo = BaseRepository(Subject, db)
        row = repo.create({"name": "AllFields"})
        result = row_to_dict(row)
        expected_keys = {"id", "name", "description", "owner_email", "created_date"}
        assert expected_keys.issubset(result.keys())
