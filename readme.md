# Sistema de Monitoramento da Qualidade de Praias

## Descrição
Este projeto consiste em uma aplicação web que exibe informações sobre a qualidade das águas das praias da Paraíba, baseado nos dados fornecidos pela SUDEMA (Superintendência de Administração do Meio Ambiente). O sistema permite aos usuários visualizar quais praias estão próprias ou impróprias para banho, ajudando na tomada de decisão sobre qual praia visitar.

## Funcionalidades
- Visualização das praias classificadas como próprias ou impróprias para banho
- Filtragem por qualidade da água (própria/imprópria)
- Design responsivo para acesso em diversos dispositivos
- Indicação visual clara da qualidade (vermelho para impróprio, verde para próprio)
- Exibição da data e hora atual
- Exibição do período de amostragem e validade da classificação

## Tecnologias Utilizadas
- **HTML5**: Estruturação da página web
- **CSS3**: Estilização da interface
- **JavaScript**: Lógica de interatividade e manipulação dos dados
- **Tailwind CSS**: Framework para estilização rápida e responsiva
- **Luxon**: Biblioteca para manipulação de data e hora
- **Font Awesome**: Biblioteca de ícones para interface
- **Fetch API**: Para requisições HTTP e obtenção de dados remotos
- **DOMParser**: Para manipulação do HTML obtido via scraping
- **Media Queries**: Para garantir responsividade em diferentes tamanhos de tela

## Como usar
1. Acesse a página da aplicação
2. Visualize a lista de praias de acordo com sua qualidade
3. Use o seletor na parte superior para alternar entre praias próprias e impróprias
4. Observe a data de validade da classificação para garantir que as informações estão atualizadas

## Fonte de dados
Os dados são obtidos diretamente do site oficial da SUDEMA, garantindo informações atualizadas sobre a condição das praias.