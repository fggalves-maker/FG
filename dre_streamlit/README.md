# DRE Gerencial 2026 · painel Streamlit

Reproduz a aba **DRE Gerencial 2026** do `DRE Gerencial 2026_v7.9.xlsb`: lê a `BASE_RL_ORÇ`,
a `Estrutura Máscara DRE` e a `lista` e refaz em Python o cálculo dos `SUMIFS`, sem copiar
valores da planilha.

**No Windows:** instale o Python (python.org, marcando "Add python.exe to PATH"), copie o
`DRE Gerencial 2026_*.xlsb` para esta pasta e dê dois cliques em **`abrir_painel.bat`**. Na
primeira vez ele instala os componentes; depois só abre o painel no navegador.

Pelo terminal:

```bash
cd dre_streamlit
pip install -r requirements.txt
# coloque o .xlsb nesta pasta (ou: export DRE_ARQUIVO=/caminho/arquivo.xlsb)
streamlit run app.py
pytest -q          # conciliação com os valores salvos na planilha
```

O painel usa a versão mais recente de `DRE Gerencial 2026*.xlsb` que estiver na pasta.

A primeira leitura da BASE (~350 mil linhas) leva cerca de 1 minuto; o resultado fica em
`.cache/*.parquet` e é refeito sozinho quando o `.xlsb` muda (data ou tamanho). O `.xlsb`, o
`.cache/` e qualquer `.xlsx` ficam fora do git: o repositório é público.

## Arquivos

| Arquivo | O que faz |
|---|---|
| `config.py` | todas as regras: colunas da BASE, subtotais, regras por Dono, bases do % vertical, períodos, cores |
| `leitura.py` | leitura do `.xlsb` (pyxlsb) e cache em parquet |
| `dre.py` | cálculo: contas → grupos → regras de Dono → subtotais; períodos; %, Δ e %Δ |
| `abrir_painel.bat` | atalho do Windows: confere Python e planilha, instala o que faltar e abre o painel |
| `gerar_html.py` + `pagina_modelo.html` | gera uma página única com os dados embutidos (`python gerar_html.py saida.html`), para abrir sem instalar nada; a saída tem os dados da empresa, não publique |
| `app.py` | interface (filtros EMPRESA, DONO, C.CUSTO, DESP. NÃO OP; mês de corte; períodos) |
| `tests/test_conciliacao.py` | concilia o painel com a aba da DRE (filtros TODOS) |

## Regras (espelham as fórmulas da planilha)

- Conta: soma do `Movimento` (E) por `para_Conta` (K), `Mês` (F) e cenário (AM: `Real` = 2026,
  `Real 2025` = 2025), com os filtros em P, O, N e AL. Como no `SUMIFS`, maiúsculas não importam.
- Grupo: soma das contas abaixo dele até voltar ao mesmo nível.
- Subtotais: dicionário `SUBTOTAIS` (ROB, ROL, MC, RO, EBTDA, LAIR, LL).
- D&A (217) só para Dono TODOS, Fernando Chable e Gislaine Coradini; financeiras (223) para TODOS,
  Liliane Peixoto, Vania Viegas e Gislaine Coradini; IRPJ/CSLL (246) e LL sem contingência (250)
  só com Dono TODOS — fórmulas F217, F223, F246 e F250.
- % vertical: linhas 13–15 sobre VENDAS, 16–52 sobre ROB, 53+ sobre ROL.
- Δ = (R26 − R25) × sinal da natureza (`lista!H:I`; sem natureza, 0). %Δ = Δ / |R25|.
- ACUMULADO = meses antes do corte; TOTAL = R26 até o corte + R25 do restante, contra R25 do ano.
  O corte padrão vem de `DRE Gerencial 2026!F492`.

## Conciliação

Com filtros TODOS, **R 2026 e R 2025 batem até o centavo em todas as 230 linhas e todos os 18
períodos**, inclusive trimestres, ACUMULADO e TOTAL. Onde Δ ou % divergem, o teste confirma que a
causa está na planilha:

- células sem fórmula: Δ e %Δ em 251 e 252; %Δ em 50, 55 e 58; % de 2025 em 251 e 252;
- % calculado sobre outra linha: nas colunas de 2026, cerca de 120 contas de CPV e despesas
  (linha 53+) dividem pela ROB (16), enquanto grupos, subtotais e as colunas de 2025 usam a ROL
  (51); I31 divide pela linha 14; algumas linhas de bonificação/devolução dividem por 13 ou 14;
- %Δ quando o R 2025 é resíduo de ponto flutuante (~0): a planilha divide por esse resíduo.
