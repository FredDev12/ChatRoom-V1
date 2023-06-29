
document.getElementById('contactForm').addEventListener('submit', function(event) {
  event.preventDefault(); // Empêcher le formulaire de se soumettre

  const name = document.getElementById('name').value;
  const email = document.getElementById('email').value;
  const subject = document.getElementById('subject').value;
  const message = document.getElementById('message').value;

  const formData = {
    name: name,
    email: email,
    subject: subject,
    message: message
  };

  console.log(formData); // Afficher les données du formulaire dans la console

  fetch('/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formData)
  })
  .then(function(response) {
    return response.text();
  })
  .then(function(data) {
    console.log(data); // Afficher la réponse du serveur

    // Vider les champs du formulaire
    document.getElementById('name').value = '';
    document.getElementById('email').value = '';
    document.getElementById('subject').value = '';
    document.getElementById('message').value = '';

    // Afficher un message de succès ou effectuer d'autres actions après l'envoi du formulaire
    // par exemple : afficher un message à l'utilisateur
    alert('Votre message a été envoyé avec succès!');
  })
  .catch(function(error) {
    console.error('Erreur :', error);
  });
});
