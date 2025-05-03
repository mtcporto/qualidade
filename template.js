// Lógica para alternar o modo claro e escuro
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = document.querySelector('#darkModeToggle i');

darkModeToggle.addEventListener('click', function() {
  document.body.classList.toggle('dark');
  document.getElementById('content').classList.toggle('dark');

  // Alterna o ícone do botão de alternância de modo escuro
  if (document.body.classList.contains('dark')) {
    darkModeIcon.classList.remove('fa-moon');
    darkModeIcon.classList.add('fa-sun');
  } else {
    darkModeIcon.classList.remove('fa-sun');
    darkModeIcon.classList.add('fa-moon');
  }
});

// Obtém o elemento onde a data e hora serão exibidas
const dateTimeElement = document.getElementById('dateTime');

// Função para atualizar a data e hora
function updateDateTime() {
  // Obtém a data e hora atual usando o Luxon
  const now = luxon.DateTime.local();

  // Formata a data e hora
  const formattedDateTime = now.toFormat('dd MMM HH:mm');

  // Exibe a data e hora formatada no elemento
  dateTimeElement.textContent = formattedDateTime;
}


// Atualiza a data e hora a cada segundo
setInterval(updateDateTime, 1000);

fetch('https://mtcporto2.pythonanywhere.com/qualidade/default/informacoes_json')
  .then(response => response.json())
  .then(data => {
    if (Array.isArray(data)) {
      const tableBody = document.getElementById('table-body');
      data.forEach(item => {
        const row = document.createElement('tr');

        const municipioCell = document.createElement('td');
        municipioCell.textContent = item.f_municipio;
        row.appendChild(municipioCell);

        const periodoCell = document.createElement('td');
        periodoCell.textContent = item.f_periodo;
        row.appendChild(periodoCell);

        const praiaCell = document.createElement('td');
        praiaCell.textContent = item.f_praia;
        row.appendChild(praiaCell);

        const estacaoCell = document.createElement('td');
        estacaoCell.textContent = item.f_estacao;
        row.appendChild(estacaoCell);

        const localCell = document.createElement('td');
        localCell.textContent = item.f_local;
        row.appendChild(localCell);

        const qualidadeCell = document.createElement('td');
        qualidadeCell.textContent = item.f_qualidade;
        row.appendChild(qualidadeCell);

        tableBody.appendChild(row);
      });
    } else {
      console.log('O arquivo JSON não está no formato esperado.');
    }
  })
  .catch(error => {
    console.log('Ocorreu um erro ao obter os dados:', error);
  });


