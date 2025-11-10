import React from 'react';
import Layout from './Layout.jsx';
import Welcome from './src/Welcome';

function App() {
  const handleCreateProject = () => {
    console.log('Create project clicked');
    //TODO: Open a new project in the UI
  };

  return (
    <Layout>
      <Welcome onCreateProject={handleCreateProject} />
    </Layout>
  );
}

export default App;
